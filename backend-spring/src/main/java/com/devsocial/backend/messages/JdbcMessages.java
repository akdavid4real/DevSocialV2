package com.devsocial.backend.messages;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcMessages implements Messages {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcMessages.class);
    private static final TypeReference<List<Map<String, Object>>> REACTION_LIST = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate sideEffects;

    public JdbcMessages(
            JdbcClient jdbc,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.sideEffects = new TransactionTemplate(transactionManager);
        this.sideEffects.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> send(UUID userId, SendMessageRequest request) {
        UUID conversationId = getOrCreateConversationId(userId, request.receiverId());
        UUID messageId = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.sql("""
                        INSERT INTO "Message"
                            (id, "conversationId", "senderId", "receiverId", content,
                             "messageType", "isDeleted", read, reactions, "readBy", "createdAt", "updatedAt")
                        VALUES
                            (:id, :conversationId, :senderId, :receiverId, :content,
                             CAST('TEXT' AS "MessageType"), false, false,
                             CAST('[]' AS jsonb), CAST('[]' AS jsonb), :now, :now)
                        """)
                .param("id", messageId)
                .param("conversationId", conversationId)
                .param("senderId", userId)
                .param("receiverId", request.receiverId())
                .param("content", request.content())
                .param("now", Timestamp.from(now))
                .update();
        jdbc.sql("""
                        UPDATE "Conversation" SET "lastActivity" = :now, "updatedAt" = :now
                        WHERE id = :conversationId
                        """)
                .param("now", Timestamp.from(now))
                .param("conversationId", conversationId)
                .update();
        afterCommit(() -> createMessageNotification(request.receiverId(), userId, now));
        return findMessage(messageId);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> getOrCreateConversation(UUID userId, UUID participantId) {
        return Map.of("id", getOrCreateConversationId(userId, participantId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> conversations(UUID userId) {
        return jdbc.sql("""
                        SELECT c.id, c."lastActivity",
                               other_user.id AS other_id, other_user.username AS other_username,
                               other_user."displayName" AS other_display_name, other_user.avatar AS other_avatar,
                               (SELECT COUNT(*) FROM "Message" unread
                                WHERE unread."conversationId" = c.id
                                  AND unread."receiverId" = :userId AND unread.read = false) AS unread_count,
                               last_message.id AS lm_id, last_message."conversationId" AS lm_conversation_id,
                               last_message."senderId" AS lm_sender_id, last_message."receiverId" AS lm_receiver_id,
                               last_message.content AS lm_content, last_message."messageType"::text AS lm_message_type,
                               last_message."fileUrl" AS lm_file_url, last_message."fileName" AS lm_file_name,
                               last_message."fileSize" AS lm_file_size, last_message."replyToId" AS lm_reply_to_id,
                               last_message."isDeleted" AS lm_is_deleted, last_message."deletedAt" AS lm_deleted_at,
                               last_message.read AS lm_read, last_message.reactions::text AS lm_reactions,
                               last_message."readBy"::text AS lm_read_by, last_message."createdAt" AS lm_created_at,
                               last_message."updatedAt" AS lm_updated_at,
                               last_sender.id AS lm_sender_user_id, last_sender.username AS lm_sender_username,
                               last_sender."displayName" AS lm_sender_display_name, last_sender.avatar AS lm_sender_avatar
                        FROM "Conversation" c
                        JOIN "ConversationParticipant" mine
                          ON mine."conversationId" = c.id AND mine."userId" = :userId
                        JOIN LATERAL (
                            SELECT participant."userId"
                            FROM "ConversationParticipant" participant
                            WHERE participant."conversationId" = c.id AND participant."userId" <> :userId
                            ORDER BY participant."joinedAt" ASC
                            LIMIT 1
                        ) other_participant ON true
                        JOIN "User" other_user ON other_user.id = other_participant."userId"
                        LEFT JOIN LATERAL (
                            SELECT message.* FROM "Message" message
                            WHERE message."conversationId" = c.id
                            ORDER BY message."createdAt" DESC
                            LIMIT 1
                        ) last_message ON true
                        LEFT JOIN "User" last_sender ON last_sender.id = last_message."senderId"
                        ORDER BY c."lastActivity" DESC
                        """)
                .param("userId", userId)
                .query(this::conversation)
                .list();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return jdbc.sql("SELECT COUNT(*) FROM \"Message\" WHERE \"receiverId\" = :userId AND read = false")
                .param("userId", userId)
                .query(Long.class)
                .single();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> messages(
            UUID userId,
            UUID conversationId,
            int limit,
            String before
    ) {
        assertParticipant(conversationId, userId);
        String cursorClause = "";
        UUID cursorId = null;
        Timestamp cursorCreatedAt = null;
        if (before != null && !before.isBlank()) {
            try {
                cursorId = UUID.fromString(before);
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message cursor");
            }
            UUID finalCursorId = cursorId;
            Cursor cursor = jdbc.sql("""
                            SELECT id, "createdAt" FROM "Message"
                            WHERE id = :messageId AND "conversationId" = :conversationId
                            """)
                    .param("messageId", finalCursorId)
                    .param("conversationId", conversationId)
                    .query((rs, row) -> new Cursor(
                            rs.getObject("id", UUID.class),
                            rs.getTimestamp("createdAt")
                    ))
                    .optional()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message cursor"));
            cursorCreatedAt = cursor.createdAt();
            cursorClause = " AND (m.\"createdAt\" < :cursorCreatedAt OR (m.\"createdAt\" = :cursorCreatedAt AND m.id < :cursorId))";
        }

        JdbcClient.StatementSpec statement = jdbc.sql(messageProjection() + """
                        WHERE m."conversationId" = :conversationId
                        %s
                        ORDER BY m."createdAt" DESC, m.id DESC
                        LIMIT :limit
                        """.formatted(cursorClause))
                .param("conversationId", conversationId)
                .param("limit", limit);
        if (cursorId != null) {
            statement = statement.param("cursorId", cursorId).param("cursorCreatedAt", cursorCreatedAt);
        }
        List<Map<String, Object>> values = new ArrayList<>(statement.query(this::message).list());
        Collections.reverse(values);
        return values;
    }

    @Override
    @Transactional
    public Map<String, Object> markRead(UUID userId, UUID conversationId) {
        assertParticipant(conversationId, userId);
        jdbc.sql("""
                        UPDATE "Message" SET read = true, "updatedAt" = CURRENT_TIMESTAMP
                        WHERE "conversationId" = :conversationId AND "receiverId" = :userId AND read = false
                        """)
                .param("conversationId", conversationId)
                .param("userId", userId)
                .update();
        return Map.of("success", true);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> addReaction(
            UUID userId,
            UUID conversationId,
            UUID messageId,
            String emoji
    ) {
        String normalized = emoji == null ? "" : emoji.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reaction emoji is required");
        }
        List<Map<String, Object>> reactions = lockedReactions(conversationId, messageId, userId);
        reactions.removeIf(reaction -> userId.toString().equals(reaction.get("userId")));
        Map<String, Object> reaction = new LinkedHashMap<>();
        reaction.put("userId", userId.toString());
        reaction.put("emoji", normalized);
        reaction.put("createdAt", Instant.now().toString());
        reaction.put("user", reactionUser(userId));
        reactions.add(reaction);
        saveReactions(messageId, reactions);
        return reactionResponse(messageId, reactions);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> removeReaction(
            UUID userId,
            UUID conversationId,
            UUID messageId,
            String emoji
    ) {
        List<Map<String, Object>> reactions = lockedReactions(conversationId, messageId, userId);
        reactions.removeIf(reaction -> userId.toString().equals(reaction.get("userId"))
                && (emoji == null || emoji.isEmpty() || emoji.equals(reaction.get("emoji"))));
        saveReactions(messageId, reactions);
        return reactionResponse(messageId, reactions);
    }

    private UUID getOrCreateConversationId(UUID userId, UUID otherUserId) {
        if (userId.equals(otherUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot message yourself");
        }
        assertCanMessage(userId, otherUserId);
        String pairKey = List.of(userId.toString(), otherUserId.toString()).stream()
                .sorted(Comparator.naturalOrder())
                .reduce((left, right) -> left + ":" + right)
                .orElseThrow();
        jdbc.sql("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(:pairKey))) locked")
                .param("pairKey", pairKey)
                .query(Integer.class)
                .single();
        UUID existing = jdbc.sql("""
                        SELECT mine."conversationId"
                        FROM "ConversationParticipant" mine
                        JOIN "ConversationParticipant" other
                          ON other."conversationId" = mine."conversationId"
                        WHERE mine."userId" = :userId AND other."userId" = :otherUserId
                        LIMIT 1
                        """)
                .param("userId", userId)
                .param("otherUserId", otherUserId)
                .query(UUID.class)
                .optional()
                .orElse(null);
        if (existing != null) return existing;

        UUID conversationId = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.sql("""
                        INSERT INTO "Conversation"
                            (id, "lastActivity", "isArchived", "createdAt", "updatedAt")
                        VALUES (:id, :now, false, :now, :now)
                        """)
                .param("id", conversationId)
                .param("now", Timestamp.from(now))
                .update();
        jdbc.sql("""
                        INSERT INTO "ConversationParticipant"
                            ("conversationId", "userId", "unreadCount", "joinedAt")
                        VALUES (:conversationId, :userId, 0, :now),
                               (:conversationId, :otherUserId, 0, :now)
                        """)
                .param("conversationId", conversationId)
                .param("userId", userId)
                .param("otherUserId", otherUserId)
                .param("now", Timestamp.from(now))
                .update();
        return conversationId;
    }

    private void assertCanMessage(UUID senderId, UUID receiverId) {
        String privacy = jdbc.sql("""
                        SELECT COALESCE("privacySettings"::text, '{}')
                        FROM "User" WHERE id = :receiverId
                        """)
                .param("receiverId", receiverId)
                .query(String.class)
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        boolean blocked = jdbc.sql("""
                        SELECT EXISTS (
                            SELECT 1 FROM "Block"
                            WHERE ("blockerId" = :senderId AND "blockedId" = :receiverId)
                               OR ("blockerId" = :receiverId AND "blockedId" = :senderId)
                        )
                        """)
                .param("senderId", senderId)
                .param("receiverId", receiverId)
                .query(Boolean.class)
                .single();
        if (blocked) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Messaging is not available between these users");
        }

        String whoCanMessage = privacySetting(privacy, "whoCanMessage", "EVERYONE").toUpperCase(Locale.ROOT);
        if ("NOBODY".equals(whoCanMessage)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This user is not accepting direct messages");
        }
        if ("FOLLOWERS".equals(whoCanMessage)) {
            boolean receiverFollowsSender = jdbc.sql("""
                            SELECT EXISTS (SELECT 1 FROM "Follow"
                                WHERE "followerId" = :receiverId AND "followingId" = :senderId)
                            """)
                    .param("receiverId", receiverId)
                    .param("senderId", senderId)
                    .query(Boolean.class)
                    .single();
            if (!receiverFollowsSender) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "This user only accepts messages from people they follow"
                );
            }
        }
    }

    private String privacySetting(String json, String key, String fallback) {
        try {
            Map<?, ?> settings = objectMapper.readValue(json, Map.class);
            if (settings == null) return fallback;
            Object value = settings.get(key);
            return value instanceof String string ? string : fallback;
        } catch (JsonProcessingException exception) {
            return fallback;
        }
    }

    private void assertParticipant(UUID conversationId, UUID userId) {
        boolean participant = jdbc.sql("""
                        SELECT EXISTS (SELECT 1 FROM "ConversationParticipant"
                            WHERE "conversationId" = :conversationId AND "userId" = :userId)
                        """)
                .param("conversationId", conversationId)
                .param("userId", userId)
                .query(Boolean.class)
                .single();
        if (!participant) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found");
        }
    }

    private List<Map<String, Object>> lockedReactions(UUID conversationId, UUID messageId, UUID userId) {
        assertParticipant(conversationId, userId);
        String raw = jdbc.sql("""
                        SELECT COALESCE(reactions::text, '[]') FROM "Message"
                        WHERE id = :messageId AND "conversationId" = :conversationId
                        FOR UPDATE
                        """)
                .param("messageId", messageId)
                .param("conversationId", conversationId)
                .query(String.class)
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        return parseReactions(raw);
    }

    private Map<String, Object> reactionUser(UUID userId) {
        return jdbc.sql("""
                        SELECT id, username, "displayName", avatar FROM "User" WHERE id = :userId
                        """)
                .param("userId", userId)
                .query((rs, row) -> {
                    Map<String, Object> user = new LinkedHashMap<>();
                    user.put("id", rs.getObject("id", UUID.class));
                    user.put("username", rs.getString("username"));
                    user.put("displayName", rs.getString("displayName"));
                    user.put("avatar", rs.getString("avatar"));
                    return user;
                })
                .single();
    }

    private List<Map<String, Object>> parseReactions(String raw) {
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(raw, REACTION_LIST);
            return new ArrayList<>(parsed.stream()
                    .filter(reaction -> reaction.get("userId") instanceof String)
                    .filter(reaction -> reaction.get("emoji") instanceof String)
                    .toList());
        } catch (JsonProcessingException exception) {
            return new ArrayList<>();
        }
    }

    private void saveReactions(UUID messageId, List<Map<String, Object>> reactions) {
        try {
            jdbc.sql("""
                            UPDATE "Message"
                            SET reactions = CAST(:reactions AS jsonb), "updatedAt" = CURRENT_TIMESTAMP
                            WHERE id = :messageId
                            """)
                    .param("reactions", objectMapper.writeValueAsString(reactions))
                    .param("messageId", messageId)
                    .update();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize message reactions", exception);
        }
    }

    private Map<String, Object> reactionResponse(UUID messageId, List<Map<String, Object>> reactions) {
        return Map.of("success", true, "data", Map.of("messageId", messageId, "reactions", reactions));
    }

    private void createMessageNotification(UUID recipientId, UUID senderId, Instant now) {
        Map<String, Object> sender = reactionUser(senderId);
        Object displayName = sender.get("displayName");
        String senderName = displayName instanceof String name && !name.isBlank()
                ? name
                : String.valueOf(sender.get("username"));
        jdbc.sql("""
                        INSERT INTO "Notification"
                            (id, "recipientId", "senderId", type, title, message,
                             "relatedId", "relatedType", read, "actionUrl", "createdAt", "updatedAt")
                        VALUES
                            (:id, :recipientId, :senderId, CAST('SYSTEM' AS "NotificationType"),
                             :title, :message, :senderId, 'user', false, '/messages', :now, :now)
                        """)
                .param("id", UUID.randomUUID())
                .param("recipientId", recipientId)
                .param("senderId", senderId)
                .param("title", "💬 New message")
                .param("message", senderName + " sent you a message")
                .param("now", Timestamp.from(now))
                .update();
    }

    private void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safely(action);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safely(() -> sideEffects.executeWithoutResult(status -> action.run()));
            }
        });
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException exception) {
            LOGGER.warn("Message notification side effect failed: {}", exception.getMessage());
        }
    }

    private Map<String, Object> findMessage(UUID messageId) {
        return jdbc.sql(messageProjection() + " WHERE m.id = :messageId")
                .param("messageId", messageId)
                .query(this::message)
                .single();
    }

    private String messageProjection() {
        return """
                SELECT m.id, m."conversationId" AS conversation_id,
                       m."senderId" AS sender_id, m."receiverId" AS receiver_id, m.content,
                       m."messageType"::text AS message_type, m."fileUrl" AS file_url,
                       m."fileName" AS file_name, m."fileSize" AS file_size,
                       m."replyToId" AS reply_to_id, m."isDeleted" AS is_deleted,
                       m."deletedAt" AS deleted_at, m.read,
                       m.reactions::text AS reactions, m."readBy"::text AS read_by,
                       m."createdAt" AS created_at, m."updatedAt" AS updated_at,
                       sender.id AS sender_user_id, sender.username AS sender_username,
                       sender."displayName" AS sender_display_name, sender.avatar AS sender_avatar,
                       receiver.id AS receiver_user_id, receiver.username AS receiver_username,
                       receiver."displayName" AS receiver_display_name, receiver.avatar AS receiver_avatar
                FROM "Message" m
                JOIN "User" sender ON sender.id = m."senderId"
                JOIN "User" receiver ON receiver.id = m."receiverId"
                """;
    }

    private Map<String, Object> message(ResultSet rs, int row) throws SQLException {
        Map<String, Object> message = messageFields(rs, "");
        message.put("sender", user(rs, "sender_user_id", "sender_username", "sender_display_name", "sender_avatar"));
        message.put("receiver", user(rs, "receiver_user_id", "receiver_username", "receiver_display_name", "receiver_avatar"));
        return message;
    }

    private Map<String, Object> conversation(ResultSet rs, int row) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", rs.getObject("id", UUID.class));
        UUID lastMessageId = rs.getObject("lm_id", UUID.class);
        Map<String, Object> lastMessage = null;
        if (lastMessageId != null) {
            lastMessage = messageFields(rs, "lm_");
            lastMessage.put("sender", user(
                    rs,
                    "lm_sender_user_id",
                    "lm_sender_username",
                    "lm_sender_display_name",
                    "lm_sender_avatar"
            ));
        }
        value.put("lastMessage", lastMessage);
        value.put("lastMessageAt", lastMessage == null ? instant(rs, "lastActivity") : lastMessage.get("createdAt"));
        value.put("otherUser", user(rs, "other_id", "other_username", "other_display_name", "other_avatar"));
        value.put("unreadCount", rs.getLong("unread_count"));
        return value;
    }

    private Map<String, Object> messageFields(ResultSet rs, String prefix) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", rs.getObject(prefix + "id", UUID.class));
        value.put("conversationId", rs.getObject(prefix + "conversation_id", UUID.class));
        value.put("senderId", rs.getObject(prefix + "sender_id", UUID.class));
        value.put("receiverId", rs.getObject(prefix + "receiver_id", UUID.class));
        value.put("content", rs.getString(prefix + "content"));
        value.put("messageType", rs.getString(prefix + "message_type"));
        value.put("fileUrl", rs.getString(prefix + "file_url"));
        value.put("fileName", rs.getString(prefix + "file_name"));
        value.put("fileSize", rs.getObject(prefix + "file_size", Integer.class));
        value.put("replyToId", rs.getObject(prefix + "reply_to_id", UUID.class));
        value.put("isDeleted", rs.getBoolean(prefix + "is_deleted"));
        value.put("deletedAt", instant(rs, prefix + "deleted_at"));
        value.put("read", rs.getBoolean(prefix + "read"));
        value.put("reactions", json(rs.getString(prefix + "reactions")));
        value.put("readBy", json(rs.getString(prefix + "read_by")));
        value.put("createdAt", instant(rs, prefix + "created_at"));
        value.put("updatedAt", instant(rs, prefix + "updated_at"));
        return value;
    }

    private Map<String, Object> user(
            ResultSet rs,
            String id,
            String username,
            String displayName,
            String avatar
    ) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", rs.getObject(id, UUID.class));
        value.put("username", rs.getString(username));
        value.put("displayName", rs.getString(displayName));
        value.put("avatar", rs.getString(avatar));
        return value;
    }

    private Object json(String raw) {
        if (raw == null) return null;
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }

    private Object instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private record Cursor(UUID id, Timestamp createdAt) {
    }
}
