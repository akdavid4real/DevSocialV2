package com.devsocial.backend.users;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
public class JdbcProfileActivity implements ProfileActivity {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcProfileActivity(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> activities(Optional<UUID> viewerId, String username, int page, int limit) {
        VisibleUser user = visibleUser(username, viewerId.orElse(null), true);
        long offset = ((long) page - 1L) * limit;
        List<Map<String, Object>> activities = jdbc.sql("""
                        SELECT id, "userId", type::text AS type, description,
                               metadata::text AS metadata, "xpEarned", "createdAt"
                        FROM "Activity"
                        WHERE "userId" = :userId
                        ORDER BY "createdAt" DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .param("userId", user.id())
                .param("limit", limit)
                .param("offset", offset)
                .query(this::activity)
                .list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"Activity\" WHERE \"userId\" = :userId")
                .param("userId", user.id())
                .query(Long.class)
                .single();
        return Map.of(
                "success", true,
                "data", activities,
                "pagination", Map.of("page", page, "limit", limit, "total", total)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> likedPosts(
            Optional<UUID> viewerId,
            String username,
            int page,
            int limit
    ) {
        VisibleUser user = visibleUser(username, viewerId.orElse(null), false);
        List<UUID> postIds = jdbc.sql("""
                        SELECT "targetId" FROM "Like"
                        WHERE "userId" = :userId AND "targetType" = CAST('POST' AS "LikeTargetType")
                        ORDER BY "createdAt" DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .param("userId", user.id())
                .param("limit", limit)
                .param("offset", ((long) page - 1L) * limit)
                .query(UUID.class)
                .list();
        return hydratePosts(postIds, viewerId.orElse(null));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> commentedPosts(
            Optional<UUID> viewerId,
            String username,
            int page,
            int limit
    ) {
        VisibleUser user = visibleUser(username, viewerId.orElse(null), false);
        List<UUID> postIds = jdbc.sql("""
                        SELECT recent."postId" FROM (
                            SELECT "postId", MAX("createdAt") AS latest
                            FROM "Comment"
                            WHERE "authorId" = :userId
                            GROUP BY "postId"
                        ) recent
                        ORDER BY recent.latest DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .param("userId", user.id())
                .param("limit", limit)
                .param("offset", ((long) page - 1L) * limit)
                .query(UUID.class)
                .list();
        return hydratePosts(postIds, viewerId.orElse(null));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> stats(Optional<UUID> viewerId, String username) {
        VisibleUser user = visibleUser(username, viewerId.orElse(null), false);
        Map<String, Object> values = jdbc.sql("""
                        SELECT
                            (SELECT COUNT(*) FROM "Post" WHERE "authorId" = :userId) AS posts_count,
                            (SELECT COUNT(*) FROM "Comment" WHERE "authorId" = :userId) AS comments_count,
                            (SELECT COUNT(*) FROM "Like" WHERE "userId" = :userId) AS likes_given,
                            (SELECT COUNT(*) FROM "Like" l
                             JOIN "Post" p ON p.id = l."targetId"
                             WHERE p."authorId" = :userId
                               AND l."targetType" = CAST('POST' AS "LikeTargetType")) AS likes_received
                        """)
                .param("userId", user.id())
                .query((rs, row) -> Map.<String, Object>of(
                        "postsCount", rs.getLong("posts_count"),
                        "commentsCount", rs.getLong("comments_count"),
                        "likesGiven", rs.getLong("likes_given"),
                        "likesReceived", rs.getLong("likes_received")
                ))
                .single();
        return Map.of("success", true, "data", values);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> heatmap(Optional<UUID> viewerId, String username) {
        VisibleUser user = visibleUser(username, viewerId.orElse(null), true);
        Timestamp cutoff = Timestamp.from(Instant.now().minus(84, ChronoUnit.DAYS));
        return jdbc.sql("""
                        SELECT activity_date, COUNT(*) AS activity_count
                        FROM (
                            SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS activity_date
                            FROM "Post" WHERE "authorId" = :userId AND "createdAt" >= :cutoff
                            UNION ALL
                            SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS activity_date
                            FROM "Comment" WHERE "authorId" = :userId AND "createdAt" >= :cutoff
                            UNION ALL
                            SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS activity_date
                            FROM "Like" WHERE "userId" = :userId AND "createdAt" >= :cutoff
                        ) activity
                        GROUP BY activity_date
                        ORDER BY activity_date ASC
                        """)
                .param("userId", user.id())
                .param("cutoff", cutoff)
                .query((rs, row) -> Map.<String, Object>of(
                        "date", rs.getString("activity_date"),
                        "count", rs.getLong("activity_count")
                ))
                .list();
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> pin(UUID userId, String username, UUID postId) {
        PinState user = pinState(userId);
        requireOwner(username, user.username());
        if (user.postIds().contains(postId)) {
            return Map.of("success", false, "message", "Post already pinned");
        }
        if (user.postIds().size() >= 3) {
            return Map.of("success", false, "message", "Maximum 3 posts can be pinned");
        }
        boolean ownsPost = jdbc.sql("""
                        SELECT EXISTS (SELECT 1 FROM "Post" WHERE id = :postId AND "authorId" = :userId)
                        """)
                .param("postId", postId)
                .param("userId", userId)
                .query(Boolean.class)
                .single();
        if (!ownsPost) throw notFound("Post not found");
        jdbc.sql("""
                        UPDATE "User"
                        SET "pinnedPosts" = array_append("pinnedPosts", :postId), "updatedAt" = CURRENT_TIMESTAMP
                        WHERE id = :userId
                        """)
                .param("postId", postId)
                .param("userId", userId)
                .update();
        return Map.of("success", true, "message", "Post pinned successfully");
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> unpin(UUID userId, String username, UUID postId) {
        PinState user = pinState(userId);
        requireOwner(username, user.username());
        jdbc.sql("""
                        UPDATE "User"
                        SET "pinnedPosts" = array_remove("pinnedPosts", :postId), "updatedAt" = CURRENT_TIMESTAMP
                        WHERE id = :userId
                        """)
                .param("postId", postId)
                .param("userId", userId)
                .update();
        return Map.of("success", true, "message", "Post unpinned successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pinnedPosts(Optional<UUID> viewerId, String username) {
        VisibleUser visible = visibleUser(username, viewerId.orElse(null), false);
        List<UUID> postIds = jdbc.sql("SELECT \"pinnedPosts\" FROM \"User\" WHERE id = :userId")
                .param("userId", visible.id())
                .query((rs, row) -> uuids(rs, "pinnedPosts"))
                .single();
        if (postIds.isEmpty()) return List.of();
        Map<UUID, Map<String, Object>> posts = hydratePosts(postIds, viewerId.orElse(null)).stream()
                .collect(Collectors.toMap(post -> (UUID) post.get("id"), Function.identity()));
        List<Map<String, Object>> ordered = new ArrayList<>();
        for (UUID postId : postIds) {
            Map<String, Object> post = posts.get(postId);
            if (post == null) continue;
            Map<String, Object> pinned = new LinkedHashMap<>(post);
            pinned.put("isPinned", true);
            ordered.add(pinned);
        }
        return ordered;
    }

    private VisibleUser visibleUser(String username, UUID viewerId, boolean requireActivityVisibility) {
        VisibleUser user = jdbc.sql("""
                        SELECT id, username, COALESCE("privacySettings"::text, '{}') AS privacy
                        FROM "User" WHERE LOWER(username) = LOWER(:username) LIMIT 1
                        """)
                .param("username", username)
                .query((rs, row) -> new VisibleUser(
                        rs.getObject("id", UUID.class),
                        rs.getString("username"),
                        jsonObject(rs.getString("privacy"))
                ))
                .optional()
                .orElseThrow(() -> notFound("User @" + username + " not found"));
        if (user.id().equals(viewerId)) return user;

        if (viewerId != null) {
            boolean blocked = jdbc.sql("""
                            SELECT EXISTS (SELECT 1 FROM "Block"
                                WHERE ("blockerId" = :viewerId AND "blockedId" = :userId)
                                   OR ("blockerId" = :userId AND "blockedId" = :viewerId))
                            """)
                    .param("viewerId", viewerId)
                    .param("userId", user.id())
                    .query(Boolean.class)
                    .single();
            if (blocked) throw notFound("User @" + username + " not found");
        }

        if (requireActivityVisibility && Boolean.FALSE.equals(user.privacy().get("showActivityStatus"))) {
            throw notFound("Activity is private");
        }
        String visibility = String.valueOf(user.privacy().getOrDefault("profileVisibility", "PUBLIC"));
        if ("PRIVATE".equals(visibility.toUpperCase(Locale.ROOT))) {
            if (viewerId == null || !follows(viewerId, user.id())) {
                throw notFound("User @" + username + " not found");
            }
        }
        return user;
    }

    private boolean follows(UUID followerId, UUID followingId) {
        return jdbc.sql("""
                        SELECT EXISTS (SELECT 1 FROM "Follow"
                            WHERE "followerId" = :followerId AND "followingId" = :followingId)
                        """)
                .param("followerId", followerId)
                .param("followingId", followingId)
                .query(Boolean.class)
                .single();
    }

    private PinState pinState(UUID userId) {
        return jdbc.sql("SELECT username, \"pinnedPosts\" FROM \"User\" WHERE id = :userId FOR UPDATE")
                .param("userId", userId)
                .query((rs, row) -> new PinState(rs.getString("username"), uuids(rs, "pinnedPosts")))
                .optional()
                .orElseThrow(() -> notFound("User not found"));
    }

    private void requireOwner(String requestedUsername, String actualUsername) {
        if (!actualUsername.equalsIgnoreCase(requestedUsername)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
        }
    }

    private List<Map<String, Object>> hydratePosts(List<UUID> postIds, UUID viewerId) {
        if (postIds.isEmpty()) return List.of();
        return jdbc.sql(postProjection() + """
                        WHERE p.id IN (:postIds) AND p.status = CAST('ACTIVE' AS "PostStatus")
                        """)
                .param("postIds", postIds)
                .param("viewerId", viewerId)
                .query(this::post)
                .list();
    }

    private String postProjection() {
        return """
                SELECT p.id, p."authorId", p."communityId", p.content, p."isAnonymous",
                       p."imageUrl", p."imageUrls", p."videoUrls", p."viewsCount", p."xpAwarded",
                       p.status::text AS status, p.slug, p."metaTitle", p."metaDescription",
                       p.poll::text AS poll, p."createdAt", p."updatedAt",
                       author.id AS user_id, author.username, author."displayName", author.avatar, author.level,
                       (SELECT COUNT(*) FROM "Like" post_like
                        WHERE post_like."targetId" = p.id
                          AND post_like."targetType" = CAST('POST' AS "LikeTargetType")) AS actual_likes,
                       (SELECT COUNT(*) FROM "Comment" comment WHERE comment."postId" = p.id) AS actual_comments,
                       EXISTS(SELECT 1 FROM "Like" own_like
                        WHERE own_like."targetId" = p.id
                          AND own_like."targetType" = CAST('POST' AS "LikeTargetType")
                          AND own_like."userId" = CAST(:viewerId AS uuid)) AS is_liked
                FROM "Post" p JOIN "User" author ON author.id = p."authorId"
                """;
    }

    private Map<String, Object> post(ResultSet rs, int row) throws SQLException {
        Map<String, Object> post = new LinkedHashMap<>();
        post.put("id", uuid(rs, "id"));
        post.put("authorId", uuid(rs, "authorId"));
        post.put("communityId", uuid(rs, "communityId"));
        post.put("content", rs.getString("content"));
        post.put("isAnonymous", rs.getBoolean("isAnonymous"));
        post.put("imageUrl", rs.getString("imageUrl"));
        post.put("imageUrls", strings(rs, "imageUrls"));
        post.put("videoUrls", strings(rs, "videoUrls"));
        post.put("likesCount", rs.getLong("actual_likes"));
        post.put("commentsCount", rs.getLong("actual_comments"));
        post.put("viewsCount", rs.getInt("viewsCount"));
        post.put("xpAwarded", rs.getInt("xpAwarded"));
        post.put("status", rs.getString("status"));
        post.put("slug", rs.getString("slug"));
        post.put("metaTitle", rs.getString("metaTitle"));
        post.put("metaDescription", rs.getString("metaDescription"));
        post.put("poll", json(rs.getString("poll")));
        post.put("createdAt", instant(rs, "createdAt"));
        post.put("updatedAt", instant(rs, "updatedAt"));
        Map<String, Object> author = new LinkedHashMap<>();
        author.put("id", uuid(rs, "user_id"));
        author.put("username", rs.getString("username"));
        author.put("displayName", rs.getString("displayName"));
        author.put("avatar", rs.getString("avatar"));
        author.put("level", rs.getInt("level"));
        post.put("author", author);
        post.put("_count", Map.of("comments", rs.getLong("actual_comments")));
        post.put("isLiked", rs.getBoolean("is_liked"));
        return post;
    }

    private Map<String, Object> activity(ResultSet rs, int row) throws SQLException {
        Map<String, Object> activity = new LinkedHashMap<>();
        activity.put("id", uuid(rs, "id"));
        activity.put("userId", uuid(rs, "userId"));
        activity.put("type", rs.getString("type"));
        activity.put("description", rs.getString("description"));
        activity.put("metadata", json(rs.getString("metadata")));
        activity.put("xpEarned", rs.getInt("xpEarned"));
        activity.put("createdAt", instant(rs, "createdAt"));
        return activity;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonObject(String raw) {
        Object value = json(raw);
        return value instanceof Map<?, ?> map ? new LinkedHashMap<>((Map<String, Object>) map) : Map.of();
    }

    private Object json(String raw) {
        if (raw == null) return null;
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (JsonProcessingException exception) {
            return null;
        }
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

    private List<UUID> uuids(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        if (value == null) return List.of();
        Object raw = value.getArray();
        if (!(raw instanceof Object[] values)) return List.of();
        List<UUID> result = new ArrayList<>();
        for (Object item : values) {
            result.add(item instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(item)));
        }
        return result;
    }

    private Object instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private record VisibleUser(UUID id, String username, Map<String, Object> privacy) {
    }

    private record PinState(String username, List<UUID> postIds) {
    }
}
