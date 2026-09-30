package com.devsocial.backend.content;

import com.devsocial.backend.storage.AssetAttachments;
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

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Repository
public class JdbcContentCommands implements ContentCommands {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcContentCommands.class);
    private static final Pattern HASHTAG = Pattern.compile("#[a-zA-Z0-9_]+");
    private static final Pattern MENTION = Pattern.compile("@(\\w+)");
    private static final Set<String> SPAM_KEYWORDS = Set.of(
            "spam", "click here", "buy now", "limited offer", "act now"
    );
    private static final int MAX_MENTIONS = 10;

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final AssetAttachments assets;
    private final TransactionTemplate sideEffects;

    public JdbcContentCommands(
            JdbcClient jdbc,
            ObjectMapper objectMapper,
            AssetAttachments assets,
            PlatformTransactionManager transactionManager
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.assets = assets;
        this.sideEffects = new TransactionTemplate(transactionManager);
        this.sideEffects.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> createPost(UUID actorId, CreatePostRequest request) {
        String content = request.content() == null ? "" : request.content().trim();
        List<String> imageUrls = safeList(request.imageUrls());
        List<String> videoUrls = safeList(request.videoUrls());
        List<String> mentions = extract(MENTION, content, true);
        if (mentions.size() > MAX_MENTIONS) {
            throw badRequest("Cannot mention more than " + MAX_MENTIONS + " users");
        }
        assertCommunityMembership(actorId, request.communityId());
        List<MentionedUser> mentionedUsers = mentionableUsers(actorId, mentions);

        UUID postId = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "Post"
                            (id, "authorId", "communityId", content, "isAnonymous", "imageUrls",
                             "videoUrls", poll, "xpAwarded", "updatedAt")
                        VALUES (:id, :actorId, :communityId, :content, :anonymous,
                            ARRAY(SELECT jsonb_array_elements_text(CAST(:images AS jsonb))),
                            ARRAY(SELECT jsonb_array_elements_text(CAST(:videos AS jsonb))),
                            CAST(:poll AS jsonb), 20, now())
                        """)
                .param("id", postId)
                .param("actorId", actorId)
                .param("communityId", request.communityId())
                .param("content", content)
                .param("anonymous", Boolean.TRUE.equals(request.isAnonymous()))
                .param("images", json(imageUrls))
                .param("videos", json(videoUrls))
                .param("poll", jsonOrNull(request.poll()))
                .update();

        for (String tagName : extract(HASHTAG, content, false)) {
            UUID tagId = jdbc.sql("""
                            INSERT INTO "Tag"
                                (id, name, slug, "usageCount", "createdById")
                            VALUES (:id, :name, :slug, 1, :actorId)
                            ON CONFLICT (name) DO UPDATE
                            SET "usageCount" = "Tag"."usageCount" + 1
                            RETURNING id
                            """)
                    .param("id", UUID.randomUUID())
                    .param("name", tagName)
                    .param("slug", tagName.toLowerCase())
                    .param("actorId", actorId)
                    .query(UUID.class).single();
            jdbc.sql("INSERT INTO \"PostTag\" (\"postId\", \"tagId\") VALUES (:postId, :tagId)")
                    .param("postId", postId).param("tagId", tagId).update();
        }

        for (MentionedUser mentioned : mentionedUsers) {
            if (mentioned.id().equals(actorId)) continue;
            jdbc.sql("""
                            INSERT INTO "UserMention"
                                (id, "postId", "mentionerId", "mentionedId")
                            VALUES (:id, :postId, :actorId, :mentionedId)
                            """)
                    .param("id", UUID.randomUUID())
                    .param("postId", postId)
                    .param("actorId", actorId)
                    .param("mentionedId", mentioned.id())
                    .update();
        }

        awardXp(actorId, "POST_CREATION", 20, postId);
        insertActivity(actorId, "POST_CREATED", preview(content, 100), 20,
                Map.of("postId", postId));
        if (request.communityId() != null) {
            jdbc.sql("UPDATE \"Community\" SET \"postCount\" = \"postCount\" + 1, \"updatedAt\" = now() WHERE id = :id")
                    .param("id", request.communityId()).update();
        }
        assets.attach(actorId, concat(imageUrls, videoUrls), "POST", postId);

        if (!mentionedUsers.isEmpty()) {
            afterCommit(() -> mentionedUsers.stream()
                    .filter(user -> !user.id().equals(actorId))
                    .forEach(user -> notifyMention(user.id(), actorId, postId, false)));
        }
        return createdPost(postId);
    }

    @Override
    @Transactional
    public Map<String, Object> deletePost(UUID actorId, UUID postId) {
        Map<String, Object> post = rawPost(postId)
                .orElseThrow(() -> notFound("Post not found"));
        if (!actorId.equals(post.get("authorId"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized delete");
        }
        assets.detach("POST", postId);
        jdbc.sql("DELETE FROM \"Post\" WHERE id = :postId").param("postId", postId).update();
        return post;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> togglePostLike(UUID actorId, UUID postId) {
        assertVisiblePost(postId, actorId);
        UUID authorId = jdbc.sql("SELECT \"authorId\" FROM \"Post\" WHERE id = :postId")
                .param("postId", postId).query(UUID.class).single();
        int deleted = jdbc.sql("""
                        DELETE FROM "Like"
                        WHERE "userId" = :actorId AND "targetId" = :postId
                          AND "targetType" = CAST('POST' AS "LikeTargetType")
                        """)
                .param("actorId", actorId).param("postId", postId).update();
        if (deleted > 0) return Map.of("liked", false);

        jdbc.sql("""
                        INSERT INTO "Like" (id, "userId", "targetId", "targetType")
                        VALUES (:id, :actorId, :postId, CAST('POST' AS "LikeTargetType"))
                        """)
                .param("id", UUID.randomUUID()).param("actorId", actorId).param("postId", postId).update();
        String content = jdbc.sql("SELECT content FROM \"Post\" WHERE id = :postId")
                .param("postId", postId).query(String.class).single();
        insertActivity(actorId, "LIKE_GIVEN", content.isBlank() ? "Liked a post" : preview(content, 80),
                0, Map.of("postId", postId));
        if (!authorId.equals(actorId)) afterCommit(() -> notifyLike(authorId, actorId, postId, null));
        return Map.of("liked", true);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> addComment(UUID actorId, UUID postId, CreateCommentRequest request) {
        assertVisiblePost(postId, actorId);
        enforceCommentRate(actorId);
        String content = request.content();
        List<String> imageUrls = safeList(request.imageUrls());
        List<String> videoUrls = safeList(request.videoUrls());
        if (content.trim().isEmpty() && imageUrls.isEmpty() && videoUrls.isEmpty()) {
            throw badRequest("Comment cannot be empty");
        }
        String lower = content.toLowerCase();
        if (SPAM_KEYWORDS.stream().anyMatch(lower::contains)) {
            LOGGER.warn("Potential spam detected from user {}", actorId);
        }
        List<String> mentions = extract(MENTION, content, true);
        if (mentions.size() > MAX_MENTIONS) {
            throw badRequest("Cannot mention more than " + MAX_MENTIONS + " users");
        }

        UUID postAuthorId = jdbc.sql("SELECT \"authorId\" FROM \"Post\" WHERE id = :postId")
                .param("postId", postId).query(UUID.class).single();
        CommentParent parent = request.parentId() == null ? null : parent(request.parentId());
        if (request.parentId() != null && parent == null) throw notFound("Parent comment not found");
        if (parent != null && !postId.equals(parent.postId())) {
            throw badRequest("Parent comment does not belong to this post");
        }
        List<MentionedUser> mentionedUsers = mentionableUsers(actorId, mentions);

        UUID commentId = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "Comment"
                            (id, "authorId", "postId", "parentId", content,
                             "imageUrls", "videoUrls", "updatedAt")
                        VALUES (:id, :actorId, :postId, :parentId, :content,
                            ARRAY(SELECT jsonb_array_elements_text(CAST(:images AS jsonb))),
                            ARRAY(SELECT jsonb_array_elements_text(CAST(:videos AS jsonb))), now())
                        """)
                .param("id", commentId).param("actorId", actorId).param("postId", postId)
                .param("parentId", request.parentId()).param("content", content)
                .param("images", json(imageUrls)).param("videos", json(videoUrls)).update();

        int xp = request.parentId() == null ? 5 : 3;
        awardXp(actorId, "COMMENT_CREATION", xp, commentId);
        insertActivity(actorId, "COMMENT_CREATED", preview(content, 100), xp,
                Map.of("postId", postId, "commentId", commentId, "isReply", request.parentId() != null));
        for (MentionedUser mentioned : mentionedUsers) {
            if (mentioned.id().equals(actorId)) continue;
            jdbc.sql("""
                            INSERT INTO "UserMention"
                                (id, "postId", "commentId", "mentionerId", "mentionedId")
                            VALUES (:id, :postId, :commentId, :actorId, :mentionedId)
                            """)
                    .param("id", UUID.randomUUID()).param("postId", postId).param("commentId", commentId)
                    .param("actorId", actorId).param("mentionedId", mentioned.id()).update();
        }
        assets.attach(actorId, concat(imageUrls, videoUrls), "COMMENT", commentId);

        afterCommit(() -> {
            for (MentionedUser mentioned : mentionedUsers) {
                if (!mentioned.id().equals(actorId)) notifyMention(mentioned.id(), actorId, postId, true, commentId);
            }
            if (parent == null && !postAuthorId.equals(actorId)) {
                notifyComment(postAuthorId, actorId, postId, content, false, null);
            }
            if (parent != null && !parent.authorId().equals(actorId)) {
                notifyComment(parent.authorId(), actorId, postId, content, true, commentId);
            }
        });
        Map<String, Object> result = createdComment(commentId);
        result.put("xpAwarded", xp);
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> deleteComment(UUID actorId, UUID commentId) {
        Map<String, Object> comment = rawComment(commentId)
                .orElseThrow(() -> notFound("Comment not found"));
        if (!actorId.equals(comment.get("authorId"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized deletion request");
        }
        assets.detach("COMMENT", commentId);
        jdbc.sql("DELETE FROM \"Comment\" WHERE id = :commentId").param("commentId", commentId).update();
        return comment;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> toggleCommentLike(UUID actorId, UUID commentId) {
        CommentLikeTarget comment = jdbc.sql("""
                        SELECT id, "authorId", "postId", "likesCount"
                        FROM "Comment" WHERE id = :commentId FOR UPDATE
                        """)
                .param("commentId", commentId)
                .query((rs, row) -> new CommentLikeTarget(
                        uuid(rs, "id"), uuid(rs, "authorId"), uuid(rs, "postId"), rs.getInt("likesCount")))
                .optional().orElseThrow(() -> notFound("Comment not found"));
        assertVisiblePost(comment.postId(), actorId);
        boolean own = actorId.equals(comment.authorId());
        int deleted = jdbc.sql("""
                        DELETE FROM "Like"
                        WHERE "userId" = :actorId AND "targetId" = :commentId
                          AND "targetType" = CAST('COMMENT' AS "LikeTargetType")
                        """)
                .param("actorId", actorId).param("commentId", commentId).update();
        if (deleted > 0) {
            jdbc.sql("UPDATE \"Comment\" SET \"likesCount\" = GREATEST(\"likesCount\" - 1, 0), \"updatedAt\" = now() WHERE id = :id")
                    .param("id", commentId).update();
            if (!own) {
                jdbc.sql("UPDATE \"User\" SET points = points - 1, \"updatedAt\" = now() WHERE id = :id")
                        .param("id", comment.authorId()).update();
                jdbc.sql("""
                                DELETE FROM "XpLog" WHERE "userId" = :userId
                                  AND type = CAST('LIKE_RECEIVED' AS "XpEventType") AND "refId" = :commentId
                                """)
                        .param("userId", comment.authorId()).param("commentId", commentId).update();
            }
            return likeResult(false, Math.max(0, comment.likesCount() - 1), own ? 0 : -1, own);
        }

        jdbc.sql("""
                        INSERT INTO "Like" (id, "userId", "targetId", "targetType")
                        VALUES (:id, :actorId, :commentId, CAST('COMMENT' AS "LikeTargetType"))
                        """)
                .param("id", UUID.randomUUID()).param("actorId", actorId).param("commentId", commentId).update();
        jdbc.sql("UPDATE \"Comment\" SET \"likesCount\" = \"likesCount\" + 1, \"updatedAt\" = now() WHERE id = :id")
                .param("id", commentId).update();
        if (!own) {
            jdbc.sql("UPDATE \"User\" SET points = points + 1, \"updatedAt\" = now() WHERE id = :id")
                    .param("id", comment.authorId()).update();
            insertXpLog(comment.authorId(), "LIKE_RECEIVED", 1, commentId);
            afterCommit(() -> notifyLike(comment.authorId(), actorId, comment.postId(), commentId));
        }
        return likeResult(true, comment.likesCount() + 1, own ? 0 : 1, own);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> vote(UUID actorId, UUID postId, PollVoteRequest request) {
        assertVisiblePost(postId, actorId);
        List<String> optionIds = request.optionIds() == null
                ? List.of() : new ArrayList<>(new LinkedHashSet<>(request.optionIds()));
        if (optionIds.isEmpty()) throw badRequest("At least one poll option is required");

        PollRow pollRow = jdbc.sql("""
                        SELECT id, poll::text AS poll FROM "Post"
                        WHERE id = :postId AND status = CAST('ACTIVE' AS "PostStatus") FOR UPDATE
                        """)
                .param("postId", postId)
                .query((rs, row) -> new PollRow(uuid(rs, "id"), rs.getString("poll")))
                .optional()
                .orElseThrow(() -> notFound("Post not found"));
        if (pollRow.poll() == null) throw notFound("Poll not found");
        Map<String, Object> poll = jsonMap(pollRow.poll());
        List<Map<String, Object>> options = mapList(poll.get("options"));
        if (options.isEmpty()) throw notFound("Poll not found");
        Object endsAt = poll.get("endsAt");
        if (endsAt instanceof String value && ended(value)) throw badRequest("Poll has ended");

        Set<String> valid = new LinkedHashSet<>();
        for (Map<String, Object> option : options) valid.add(String.valueOf(option.get("id")));
        if (optionIds.stream().anyMatch(id -> !valid.contains(id))) throw badRequest("Invalid poll option");
        for (Map<String, Object> option : options) {
            if (stringList(option.get("voters")).contains(actorId.toString())) {
                throw badRequest("You have already voted in this poll");
            }
        }

        Map<String, Object> settings = poll.get("settings") instanceof Map<?, ?> raw
                ? copyMap(raw) : Map.of();
        boolean multiple = Boolean.TRUE.equals(settings.get("multipleChoice"));
        int maxChoices = settings.get("maxChoices") instanceof Number number ? number.intValue() : 1;
        if (maxChoices <= 0) maxChoices = 1;
        if (!multiple && optionIds.size() > 1) throw badRequest("This poll only allows one choice");
        if (multiple && optionIds.size() > maxChoices) {
            throw badRequest("This poll allows up to " + maxChoices + " choices");
        }

        Set<String> selected = new LinkedHashSet<>(optionIds);
        List<Map<String, Object>> updatedOptions = new ArrayList<>();
        for (Map<String, Object> original : options) {
            Map<String, Object> option = new LinkedHashMap<>(original);
            List<String> voters = new ArrayList<>(stringList(option.get("voters")));
            if (selected.contains(String.valueOf(option.get("id")))) {
                int votes = option.get("votes") instanceof Number number ? number.intValue() : 0;
                option.put("votes", votes + 1);
                voters.add(actorId.toString());
            }
            option.put("voters", voters);
            updatedOptions.add(option);
        }
        poll.put("options", updatedOptions);
        int totalVotes = poll.get("totalVotes") instanceof Number number ? number.intValue() : 0;
        poll.put("totalVotes", totalVotes + 1);
        jdbc.sql("UPDATE \"Post\" SET poll = CAST(:poll AS jsonb), \"updatedAt\" = now() WHERE id = :postId")
                .param("poll", json(poll)).param("postId", postId).update();
        awardXp(actorId, "POLL_INTERACTION", 5, postId);
        return Map.of("poll", poll, "xpAwarded", 5);
    }

    private void assertCommunityMembership(UUID actorId, UUID communityId) {
        if (communityId == null) return;
        boolean exists = jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"Community\" WHERE id = :id)")
                .param("id", communityId).query(Boolean.class).single();
        if (!exists) throw notFound("Community not found");
        boolean member = jdbc.sql("""
                        SELECT EXISTS(SELECT 1 FROM "CommunityMember"
                            WHERE "communityId" = :communityId AND "userId" = :actorId)
                        """)
                .param("communityId", communityId).param("actorId", actorId)
                .query(Boolean.class).single();
        if (!member) throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Join this community before posting");
    }

    private void assertVisiblePost(UUID postId, UUID viewerId) {
        boolean visible = jdbc.sql("""
                        SELECT EXISTS(
                            SELECT 1 FROM "Post" p
                            JOIN "User" u ON u.id = p."authorId"
                            LEFT JOIN "Community" community ON community.id = p."communityId"
                            WHERE p.id = :postId AND p.status = CAST('ACTIVE' AS "PostStatus")
                              AND NOT EXISTS (
                                SELECT 1 FROM "Block" b
                                WHERE (b."blockerId" = :viewerId AND b."blockedId" = p."authorId")
                                   OR (b."blockerId" = p."authorId" AND b."blockedId" = :viewerId)
                              )
                              AND (
                                UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                                OR p."authorId" = :viewerId
                                OR EXISTS (SELECT 1 FROM "Follow" f
                                    WHERE f."followerId" = :viewerId AND f."followingId" = p."authorId")
                              )
                              AND (
                                COALESCE(community."isPrivate", false) = false
                                OR EXISTS (SELECT 1 FROM "CommunityMember" member
                                    WHERE member."communityId" = p."communityId" AND member."userId" = :viewerId)
                              )
                        )
                        """)
                .param("postId", postId).param("viewerId", viewerId)
                .query(Boolean.class).single();
        if (!visible) throw notFound("Post not found");
    }

    private void enforceCommentRate(UUID actorId) {
        long recent = jdbc.sql("""
                        SELECT COUNT(*) FROM "Comment"
                        WHERE "authorId" = :actorId AND "createdAt" >= now() - INTERVAL '1 minute'
                        """)
                .param("actorId", actorId).query(Long.class).single();
        if (recent >= 10) throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Rate limit exceeded. Maximum 10 comments per minute."
        );
    }

    private List<MentionedUser> mentionableUsers(UUID actorId, List<String> usernames) {
        Map<UUID, MentionedUser> result = new LinkedHashMap<>();
        for (String username : usernames) {
            MentionedUser user = jdbc.sql("""
                            SELECT id, username, "privacySettings"::text AS privacy
                            FROM "User" WHERE LOWER(username) = LOWER(:username) LIMIT 1
                            """)
                    .param("username", username)
                    .query((rs, row) -> new MentionedUser(
                            uuid(rs, "id"), rs.getString("username"), jsonMap(rs.getString("privacy"))))
                    .optional().orElse(null);
            if (user == null || user.id().equals(actorId)) {
                if (user != null) result.putIfAbsent(user.id(), user);
                continue;
            }
            boolean blocked = jdbc.sql("""
                            SELECT EXISTS(SELECT 1 FROM "Block"
                              WHERE ("blockerId" = :actorId AND "blockedId" = :targetId)
                                 OR ("blockerId" = :targetId AND "blockedId" = :actorId))
                            """)
                    .param("actorId", actorId).param("targetId", user.id())
                    .query(Boolean.class).single();
            if (!blocked && !Boolean.FALSE.equals(user.privacy().get("allowMentions"))) {
                result.putIfAbsent(user.id(), user);
            }
        }
        return new ArrayList<>(result.values());
    }

    private void awardXp(UUID userId, String type, int amount, UUID refId) {
        jdbc.sql("UPDATE \"User\" SET points = points + :amount, \"updatedAt\" = now() WHERE id = :userId")
                .param("amount", amount).param("userId", userId).update();
        insertXpLog(userId, type, amount, refId);
    }

    private void insertXpLog(UUID userId, String type, int amount, UUID refId) {
        jdbc.sql("""
                        INSERT INTO "XpLog" (id, "userId", type, "xpAmount", "refId")
                        VALUES (:id, :userId, CAST(:type AS "XpEventType"), :amount, :refId)
                        """)
                .param("id", UUID.randomUUID()).param("userId", userId).param("type", type)
                .param("amount", amount).param("refId", refId).update();
    }

    private void insertActivity(
            UUID userId,
            String type,
            String description,
            int xp,
            Map<String, Object> metadata
    ) {
        jdbc.sql("""
                        INSERT INTO "Activity" (id, "userId", type, description, "xpEarned", metadata)
                        VALUES (:id, :userId, CAST(:type AS "ActivityType"), :description, :xp, CAST(:metadata AS jsonb))
                        """)
                .param("id", UUID.randomUUID()).param("userId", userId).param("type", type)
                .param("description", description).param("xp", xp).param("metadata", json(metadata)).update();
    }

    private Map<String, Object> createdPost(UUID postId) {
        Map<String, Object> post = rawPost(postId).orElseThrow();
        post.put("author", userSummary((UUID) post.get("authorId")));
        post.put("tags", jdbc.sql("""
                        SELECT pt."postId", pt."tagId", t.id, t.name, t.slug,
                               t.description, t.color, t."usageCount"
                        FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId" WHERE pt."postId" = :postId
                        """).param("postId", postId).query((rs, row) -> {
                            Map<String, Object> tag = new LinkedHashMap<>();
                            tag.put("id", uuid(rs, "id"));
                            tag.put("name", rs.getString("name"));
                            tag.put("slug", rs.getString("slug"));
                            tag.put("description", rs.getString("description"));
                            tag.put("color", rs.getString("color"));
                            tag.put("usageCount", rs.getInt("usageCount"));
                            Map<String, Object> relation = new LinkedHashMap<>();
                            relation.put("postId", uuid(rs, "postId"));
                            relation.put("tagId", uuid(rs, "tagId"));
                            relation.put("tag", tag);
                            return relation;
                        }).list());
        post.put("mentions", jdbc.sql("""
                        SELECT mention.id, mention."postId", mention."commentId", mention."mentionerId",
                               mention."mentionedId", mention."createdAt",
                               u.id AS user_id, u.username, u."displayName", u.avatar
                        FROM "UserMention" mention
                        JOIN "User" u ON u.id = mention."mentionedId"
                        WHERE mention."postId" = :postId AND mention."commentId" IS NULL
                        """).param("postId", postId).query((rs, row) -> {
                            Map<String, Object> relation = new LinkedHashMap<>();
                            relation.put("id", uuid(rs, "id"));
                            relation.put("postId", uuid(rs, "postId"));
                            relation.put("commentId", uuid(rs, "commentId"));
                            relation.put("mentionerId", uuid(rs, "mentionerId"));
                            relation.put("mentionedId", uuid(rs, "mentionedId"));
                            relation.put("createdAt", instant(rs, "createdAt"));
                            Map<String, Object> mentioned = new LinkedHashMap<>();
                            mentioned.put("id", uuid(rs, "user_id"));
                            mentioned.put("username", rs.getString("username"));
                            mentioned.put("displayName", rs.getString("displayName"));
                            mentioned.put("avatar", rs.getString("avatar"));
                            relation.put("mentioned", mentioned);
                            return relation;
                        }).list());
        return post;
    }

    private Optional<Map<String, Object>> rawPost(UUID postId) {
        return jdbc.sql("SELECT *, status::text AS status_text, poll::text AS poll_text FROM \"Post\" WHERE id = :id")
                .param("id", postId).query((rs, row) -> {
                    Map<String, Object> post = new LinkedHashMap<>();
                    post.put("id", uuid(rs, "id"));
                    post.put("authorId", uuid(rs, "authorId"));
                    post.put("communityId", uuid(rs, "communityId"));
                    post.put("content", rs.getString("content"));
                    post.put("isAnonymous", rs.getBoolean("isAnonymous"));
                    post.put("imageUrl", rs.getString("imageUrl"));
                    post.put("imageUrls", strings(rs, "imageUrls"));
                    post.put("videoUrls", strings(rs, "videoUrls"));
                    post.put("likesCount", rs.getInt("likesCount"));
                    post.put("commentsCount", rs.getInt("commentsCount"));
                    post.put("viewsCount", rs.getInt("viewsCount"));
                    post.put("xpAwarded", rs.getInt("xpAwarded"));
                    post.put("status", rs.getString("status_text"));
                    post.put("slug", rs.getString("slug"));
                    post.put("metaTitle", rs.getString("metaTitle"));
                    post.put("metaDescription", rs.getString("metaDescription"));
                    post.put("poll", parseJson(rs.getString("poll_text")));
                    post.put("createdAt", instant(rs, "createdAt"));
                    post.put("updatedAt", instant(rs, "updatedAt"));
                    return post;
                }).optional();
    }

    private Map<String, Object> createdComment(UUID commentId) {
        Map<String, Object> comment = rawComment(commentId).orElseThrow();
        comment.put("author", userSummary((UUID) comment.get("authorId")));
        return comment;
    }

    private Optional<Map<String, Object>> rawComment(UUID commentId) {
        return jdbc.sql("SELECT * FROM \"Comment\" WHERE id = :id")
                .param("id", commentId).query((rs, row) -> {
                    Map<String, Object> comment = new LinkedHashMap<>();
                    comment.put("id", uuid(rs, "id"));
                    comment.put("authorId", uuid(rs, "authorId"));
                    comment.put("postId", uuid(rs, "postId"));
                    comment.put("parentId", uuid(rs, "parentId"));
                    comment.put("content", rs.getString("content"));
                    comment.put("imageUrls", strings(rs, "imageUrls"));
                    comment.put("videoUrls", strings(rs, "videoUrls"));
                    comment.put("likesCount", rs.getInt("likesCount"));
                    comment.put("createdAt", instant(rs, "createdAt"));
                    comment.put("updatedAt", instant(rs, "updatedAt"));
                    return comment;
                }).optional();
    }

    private Map<String, Object> userSummary(UUID userId) {
        return jdbc.sql("SELECT id, username, \"displayName\", avatar, level FROM \"User\" WHERE id = :id")
                .param("id", userId).query((rs, row) -> {
                    Map<String, Object> user = new LinkedHashMap<>();
                    user.put("id", uuid(rs, "id"));
                    user.put("username", rs.getString("username"));
                    user.put("displayName", rs.getString("displayName"));
                    user.put("avatar", rs.getString("avatar"));
                    user.put("level", rs.getInt("level"));
                    return user;
                }).single();
    }

    private CommentParent parent(UUID commentId) {
        return jdbc.sql("SELECT \"authorId\", \"postId\" FROM \"Comment\" WHERE id = :id")
                .param("id", commentId)
                .query((rs, row) -> new CommentParent(uuid(rs, "authorId"), uuid(rs, "postId")))
                .optional().orElse(null);
    }

    private Map<String, Object> likeResult(boolean liked, int count, int xp, boolean own) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("liked", liked);
        result.put("likesCount", count);
        result.put("xpChange", xp);
        result.put("isOwnComment", own);
        return result;
    }

    private void notifyMention(UUID recipientId, UUID senderId, UUID postId, boolean comment) {
        notifyMention(recipientId, senderId, postId, comment, null);
    }

    private void notifyMention(UUID recipientId, UUID senderId, UUID postId, boolean comment, UUID commentId) {
        insertNotification(
                recipientId, senderId, "MENTION", "📢 You were mentioned",
                comment ? " mentioned you in a comment" : " mentioned you in a post",
                comment ? commentId : postId, comment ? "comment" : "post", "/posts/" + postId
        );
    }

    private void notifyComment(
            UUID recipientId,
            UUID senderId,
            UUID postId,
            String content,
            boolean reply,
            UUID commentId
    ) {
        String preview = preview(content, 50);
        insertNotification(
                recipientId, senderId, "COMMENT", reply ? "💬 New Reply" : "💬 New Comment",
                reply ? " replied: " + preview : ": " + preview,
                reply ? commentId : postId, reply ? "comment" : "post", "/posts/" + postId
        );
    }

    private void notifyLike(UUID recipientId, UUID senderId, UUID postId, UUID commentId) {
        insertNotification(
                recipientId, senderId, "LIKE", commentId == null ? "❤️ New Like" : "❤️ Comment Liked",
                commentId == null ? " liked your post" : " liked your comment",
                commentId == null ? postId : commentId, commentId == null ? "post" : "comment", "/posts/" + postId
        );
    }

    private void insertNotification(
            UUID recipientId,
            UUID senderId,
            String type,
            String title,
            String messageSuffix,
            UUID relatedId,
            String relatedType,
            String actionUrl
    ) {
        if (recipientId.equals(senderId)) return;
        jdbc.sql("""
                        INSERT INTO "Notification"
                            (id, "recipientId", "senderId", type, title, message,
                             "relatedId", "relatedType", "actionUrl", "updatedAt")
                        SELECT :id, :recipientId, :senderId, CAST(:type AS "NotificationType"),
                               :title, COALESCE(NULLIF("displayName", ''), username, 'Someone') || :messageSuffix,
                               :relatedId, :relatedType, :actionUrl, now()
                        FROM "User" sender
                        WHERE sender.id = :senderId
                          AND NOT EXISTS (SELECT 1 FROM "Block" b
                            WHERE (b."blockerId" = :recipientId AND b."blockedId" = :senderId)
                               OR (b."blockerId" = :senderId AND b."blockedId" = :recipientId))
                        """)
                .param("id", UUID.randomUUID()).param("recipientId", recipientId).param("senderId", senderId)
                .param("type", type).param("title", title).param("messageSuffix", messageSuffix)
                .param("relatedId", relatedId).param("relatedType", relatedType).param("actionUrl", actionUrl)
                .update();
    }

    private void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    sideEffects.executeWithoutResult(status -> action.run());
                } catch (RuntimeException exception) {
                    LOGGER.warn("Content notification side effect failed: {}", exception.getMessage());
                }
            }
        });
    }

    private List<String> extract(Pattern pattern, String content, boolean group) {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String value = group ? matcher.group(1) : matcher.group().substring(1).toLowerCase();
            values.add(value);
        }
        return new ArrayList<>(values);
    }

    private List<String> safeList(List<String> value) {
        return value == null ? List.of() : List.copyOf(value);
    }

    private List<String> concat(List<String> first, List<String> second) {
        List<String> values = new ArrayList<>(first);
        values.addAll(second);
        return values;
    }

    private String preview(String value, int limit) {
        if (value == null) return "";
        return value.length() > limit ? value.substring(0, limit) + "..." : value;
    }

    private boolean ended(String value) {
        try {
            return Instant.parse(value).isBefore(Instant.now());
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Value cannot be encoded as JSON", exception);
        }
    }

    private String jsonOrNull(Object value) {
        return value == null ? null : json(value);
    }

    private Object parseJson(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }

    private Map<String, Object> jsonMap(String value) {
        if (value == null) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(value, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (JsonProcessingException exception) {
            return new LinkedHashMap<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> mapList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) result.add(copyMap(map));
        }
        return result;
    }

    private Map<String, Object> copyMap(Map<?, ?> value) {
        Map<String, Object> result = new LinkedHashMap<>();
        value.forEach((key, item) -> result.put(String.valueOf(key), item));
        return result;
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().map(String::valueOf).toList();
    }

    private UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private List<String> strings(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        if (value == null) return List.of();
        Object raw = value.getArray();
        if (!(raw instanceof Object[] values)) return List.of();
        List<String> result = new ArrayList<>();
        for (Object item : values) result.add(String.valueOf(item));
        return result;
    }

    private Object instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private record MentionedUser(UUID id, String username, Map<String, Object> privacy) {}
    private record CommentParent(UUID authorId, UUID postId) {}
    private record CommentLikeTarget(UUID id, UUID authorId, UUID postId, int likesCount) {}
    private record PollRow(UUID id, String poll) {}
}
