package com.devsocial.backend.notifications;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Repository
public class JdbcNotifications implements Notifications {
    private static final Pattern EXPO_TOKEN = Pattern.compile("^(ExponentPushToken|ExpoPushToken)\\[[^\\]]+\\]$");
    private static final TypeReference<Map<String, Object>> OBJECT_MAP = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final boolean webPushConfigured;

    public JdbcNotifications(
            JdbcClient jdbc,
            ObjectMapper objectMapper,
            @Value("${VAPID_PUBLIC_KEY:}") String publicKey,
            @Value("${VAPID_PRIVATE_KEY:}") String privateKey,
            @Value("${VAPID_SUBJECT:}") String subject
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.webPushConfigured = !publicKey.isBlank() && !privateKey.isBlank() && !subject.isBlank();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID userId, UUID notificationId) {
        return jdbc.sql(notificationProjection() + " WHERE n.id = :notificationId AND n.\"recipientId\" = :userId")
                .param("notificationId", notificationId)
                .param("userId", userId)
                .query(this::notification)
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> list(UUID userId, int limit, boolean unreadOnly) {
        List<Map<String, Object>> values = jdbc.sql(notificationProjection() + """
                        WHERE n."recipientId" = :userId
                          AND (:unreadOnly = false OR n.read = false)
                        ORDER BY n."createdAt" DESC
                        LIMIT :limit
                        """)
                .param("userId", userId)
                .param("unreadOnly", unreadOnly)
                .param("limit", limit)
                .query(this::notification)
                .list();
        long unreadCount = jdbc.sql("""
                        SELECT COUNT(*) FROM "Notification"
                        WHERE "recipientId" = :userId AND read = false
                        """)
                .param("userId", userId)
                .query(Long.class)
                .single();
        return Map.of("success", true, "data", Map.of(
                "notifications", values,
                "unreadCount", unreadCount
        ));
    }

    @Override
    @Transactional
    public Map<String, Object> mark(UUID userId, List<UUID> notificationIds, boolean read) {
        if (!notificationIds.isEmpty()) {
            jdbc.sql("""
                            UPDATE "Notification" SET read = :read, "updatedAt" = CURRENT_TIMESTAMP
                            WHERE "recipientId" = :userId AND id IN (:ids)
                            """)
                    .param("read", read)
                    .param("userId", userId)
                    .param("ids", notificationIds)
                    .update();
        } else if (read) {
            jdbc.sql("""
                            UPDATE "Notification" SET read = true, "updatedAt" = CURRENT_TIMESTAMP
                            WHERE "recipientId" = :userId AND read = false
                            """)
                    .param("userId", userId)
                    .update();
        }
        return Map.of("success", true);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> pushSubscription(UUID userId) {
        PushStore store = loadStore(userId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("subscribed", store.web() != null);
        result.put("subscription", store.web());
        result.put("configured", webPushConfigured);
        result.put("mobileDevices", store.expoTokens().size());
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> savePushSubscription(UUID userId, PushSubscriptionRequest request) {
        PushStore store = loadStore(userId);
        Map<String, Object> keys = Map.of("p256dh", request.keys().p256dh(), "auth", request.keys().auth());
        saveStore(userId, new PushStore(Map.of("endpoint", request.endpoint(), "keys", keys), store.expoTokens()));
        return Map.of("subscribed", true, "configured", webPushConfigured);
    }

    @Override
    @Transactional
    public Map<String, Object> removePushSubscription(UUID userId) {
        PushStore store = loadStore(userId);
        saveStore(userId, new PushStore(null, store.expoTokens()));
        return Map.of("subscribed", false);
    }

    @Override
    @Transactional
    public Map<String, Object> registerMobilePushToken(UUID userId, String token) {
        PushStore store = loadStore(userId);
        List<String> tokens = new ArrayList<>();
        tokens.add(token);
        store.expoTokens().stream().filter(existing -> !existing.equals(token)).limit(4).forEach(tokens::add);
        saveStore(userId, new PushStore(store.web(), List.copyOf(tokens)));
        return Map.of("registered", true);
    }

    @Override
    @Transactional
    public Map<String, Object> removeMobilePushToken(UUID userId, String token) {
        PushStore store = loadStore(userId);
        List<String> tokens = store.expoTokens().stream().filter(existing -> !existing.equals(token)).toList();
        saveStore(userId, new PushStore(store.web(), tokens));
        return Map.of("registered", false);
    }

    private String notificationProjection() {
        return """
                SELECT n.id, n."recipientId", n."senderId", n.type::text AS type,
                       n.title, n.message, n."relatedId", n."relatedType", n.read,
                       n."actionUrl", n."createdAt", n."updatedAt",
                       sender.id AS sender_id, sender.username, sender."displayName",
                       sender.avatar, sender.level
                FROM "Notification" n
                JOIN "User" sender ON sender.id = n."senderId"
                """;
    }

    private Map<String, Object> notification(ResultSet rs, int row) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", rs.getObject("id", UUID.class));
        value.put("recipientId", rs.getObject("recipientId", UUID.class));
        value.put("senderId", rs.getObject("senderId", UUID.class));
        value.put("type", rs.getString("type"));
        value.put("title", rs.getString("title"));
        value.put("message", rs.getString("message"));
        value.put("relatedId", rs.getObject("relatedId", UUID.class));
        value.put("relatedType", rs.getString("relatedType"));
        value.put("read", rs.getBoolean("read"));
        value.put("actionUrl", rs.getString("actionUrl"));
        value.put("createdAt", instant(rs, "createdAt"));
        value.put("updatedAt", instant(rs, "updatedAt"));
        Map<String, Object> sender = new LinkedHashMap<>();
        sender.put("id", rs.getObject("sender_id", UUID.class));
        sender.put("username", rs.getString("username"));
        sender.put("displayName", rs.getString("displayName"));
        sender.put("avatar", rs.getString("avatar"));
        sender.put("level", rs.getInt("level"));
        value.put("sender", sender);
        return value;
    }

    private Object instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private PushStore loadStore(UUID userId) {
        String raw = jdbc.sql("SELECT COALESCE(\"pushSubscription\"::text, 'null') FROM \"User\" WHERE id = :userId")
                .param("userId", userId)
                .query(String.class)
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return normalize(raw);
    }

    private PushStore normalize(String raw) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) return new PushStore(null, List.of());
        try {
            Map<String, Object> value = objectMapper.readValue(raw, OBJECT_MAP);
            if (value.get("endpoint") instanceof String) {
                return new PushStore(value, List.of());
            }
            Map<String, Object> web = value.get("web") instanceof Map<?, ?> map ? stringMap(map) : null;
            List<String> tokens = value.get("expoTokens") instanceof List<?> list
                    ? list.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .filter(token -> EXPO_TOKEN.matcher(token).matches())
                    .limit(5)
                    .toList()
                    : List.of();
            return new PushStore(web, tokens);
        } catch (JsonProcessingException exception) {
            return new PushStore(null, List.of());
        }
    }

    private Map<String, Object> stringMap(Map<?, ?> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private void saveStore(UUID userId, PushStore store) {
        boolean empty = store.web() == null && store.expoTokens().isEmpty();
        Object value;
        if (empty) {
            value = null;
        } else {
            Map<String, Object> stored = new LinkedHashMap<>();
            stored.put("web", store.web());
            stored.put("expoTokens", store.expoTokens());
            value = stored;
        }
        try {
            String json = objectMapper.writeValueAsString(value);
            jdbc.sql("UPDATE \"User\" SET \"pushSubscription\" = CAST(:store AS jsonb), \"updatedAt\" = CURRENT_TIMESTAMP WHERE id = :userId")
                    .param("store", json)
                    .param("userId", userId)
                    .update();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize push subscription", exception);
        }
    }

    private record PushStore(Map<String, Object> web, List<String> expoTokens) {
    }
}
