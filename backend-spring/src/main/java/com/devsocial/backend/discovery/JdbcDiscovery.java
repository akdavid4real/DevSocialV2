package com.devsocial.backend.discovery;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Repository
public class JdbcDiscovery implements Discovery {
    private static final Pattern HASHTAG = Pattern.compile("#(\\w+)");

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcDiscovery(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> search(
            String rawQuery,
            String rawType,
            int page,
            int limit,
            Optional<UUID> viewerId
    ) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search query is required");
        String type = normalizeType(rawType);
        int offset = (page - 1) * limit;
        int resultOffset = "all".equals(type) ? 0 : offset;
        int resultLimit = "all".equals(type) ? 10 : limit;
        UUID viewer = viewerId.orElse(null);

        List<Map<String, Object>> posts = List.of();
        List<Map<String, Object>> users = List.of();
        List<Map<String, Object>> tags = List.of();
        if ("all".equals(type) || "posts".equals(type)) {
            posts = searchPosts(query, resultOffset, resultLimit, viewer);
        }
        if ("all".equals(type) || "users".equals(type)) {
            users = searchUsers(query, resultOffset, resultLimit, viewer);
        }
        if ("all".equals(type) || "tags".equals(type)) {
            tags = searchTags(query, resultOffset, resultLimit);
        }

        long totalPosts = "posts".equals(type) ? countPosts(query, viewer) : posts.size();
        long totalUsers = "users".equals(type) ? countUsers(query, viewer) : users.size();
        long totalTags = "tags".equals(type) ? countTags(query) : tags.size();
        long total = switch (type) {
            case "posts" -> totalPosts;
            case "users" -> totalUsers;
            case "tags" -> totalTags;
            default -> totalPosts + totalUsers + totalTags;
        };
        int currentLength = switch (type) {
            case "posts" -> posts.size();
            case "users" -> users.size();
            case "tags" -> tags.size();
            default -> posts.size() + users.size() + tags.size();
        };

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("posts", posts);
        results.put("users", users);
        results.put("tags", tags);
        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("currentPage", page);
        pagination.put("totalPages", (int) Math.ceil((double) total / limit));
        pagination.put("totalResults", total);
        pagination.put("hasMore", offset + currentLength < total);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("results", results);
        data.put("query", query);
        data.put("type", type);
        data.put("pagination", pagination);
        return Map.of("success", true, "data", data);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> trending(String period, Optional<UUID> viewerId) {
        Instant cutoff = cutoff(period);
        UUID viewer = viewerId.orElse(null);
        List<Map<String, Object>> posts = jdbc.sql("""
                        WITH candidates AS (
                            SELECT id FROM "Post"
                            WHERE "createdAt" >= :cutoff AND status = CAST('ACTIVE' AS "PostStatus")
                            ORDER BY "createdAt" DESC LIMIT 100
                        )
                        %s
                        JOIN candidates candidate ON candidate.id = p.id
                        WHERE %s
                        ORDER BY trending_score DESC
                        LIMIT 20
                        """.formatted(postProjection(true), visibilityClause()))
                .param("cutoff", Timestamp.from(cutoff))
                .param("viewerId", viewer)
                .query((rs, row) -> post(rs, true))
                .list();

        List<Map<String, Object>> topics = trendingTopics(posts);
        List<Map<String, Object>> risingUsers = risingUsers(cutoff);
        long views = posts.stream().mapToLong(post -> ((Number) post.get("viewsCount")).longValue()).sum();
        long engagements = posts.stream().mapToLong(post ->
                ((Number) post.get("likesCount")).longValue()
                        + ((Number) post.get("commentsCount")).longValue()).sum();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("hotPosts", posts.size());
        stats.put("totalViews", formatNumber(views));
        stats.put("engagements", formatNumber(engagements));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trendingPosts", posts);
        result.put("trendingTopics", topics);
        result.put("risingUsers", risingUsers);
        result.put("stats", stats);
        return result;
    }

    private List<Map<String, Object>> searchPosts(String query, int offset, int limit, UUID viewer) {
        String normalizedTag = query.replaceFirst("^#", "").trim();
        List<Map<String, Object>> posts = jdbc.sql(postProjection(false) + """
                        WHERE p.status = CAST('ACTIVE' AS "PostStatus")
                          AND (p.content ILIKE :query OR u.username ILIKE :query
                            OR u."displayName" ILIKE :query
                            OR EXISTS (
                                SELECT 1 FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId"
                                WHERE pt."postId" = p.id AND t.name ILIKE :tagQuery
                            ))
                          AND %s
                        ORDER BY p."createdAt" DESC LIMIT :limit OFFSET :offset
                        """.formatted(visibilityClause()))
                .param("query", "%" + query + "%")
                .param("tagQuery", "%" + normalizedTag + "%")
                .param("viewerId", viewer)
                .param("limit", limit)
                .param("offset", offset)
                .query((rs, row) -> post(rs, false))
                .list();
        attachTags(posts);
        return posts;
    }

    private long countPosts(String query, UUID viewer) {
        String normalizedTag = query.replaceFirst("^#", "").trim();
        return jdbc.sql("""
                        SELECT COUNT(*) FROM "Post" p
                        JOIN "User" u ON u.id = p."authorId"
                        LEFT JOIN "Community" community ON community.id = p."communityId"
                        WHERE p.status = CAST('ACTIVE' AS "PostStatus")
                          AND (p.content ILIKE :query OR u.username ILIKE :query
                            OR u."displayName" ILIKE :query
                            OR EXISTS (SELECT 1 FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId"
                                WHERE pt."postId" = p.id AND t.name ILIKE :tagQuery))
                          AND %s
                        """.formatted(visibilityClause()))
                .param("query", "%" + query + "%")
                .param("tagQuery", "%" + normalizedTag + "%")
                .param("viewerId", viewer)
                .query(Long.class).single();
    }

    private List<Map<String, Object>> searchUsers(String query, int offset, int limit, UUID viewer) {
        return jdbc.sql(userSearchProjection() + """
                        WHERE (u.username ILIKE :query OR u."displayName" ILIKE :query OR u.bio ILIKE :query
                            OR :exact = ANY(u."techStack") OR :exact = ANY(u.interests))
                          AND %s
                        ORDER BY u.points DESC, u."createdAt" DESC LIMIT :limit OFFSET :offset
                        """.formatted(userVisibilityClause()))
                .param("query", "%" + query + "%")
                .param("exact", query)
                .param("viewerId", viewer)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::searchUser)
                .list();
    }

    private long countUsers(String query, UUID viewer) {
        return jdbc.sql("""
                        SELECT COUNT(*) FROM "User" u
                        WHERE (u.username ILIKE :query OR u."displayName" ILIKE :query OR u.bio ILIKE :query
                            OR :exact = ANY(u."techStack") OR :exact = ANY(u.interests))
                          AND %s
                        """.formatted(userVisibilityClause()))
                .param("query", "%" + query + "%")
                .param("exact", query)
                .param("viewerId", viewer)
                .query(Long.class).single();
    }

    private List<Map<String, Object>> searchTags(String query, int offset, int limit) {
        String normalized = query.replaceFirst("^#", "").trim();
        return jdbc.sql("""
                        SELECT t.id, t.name, t.slug, t.description, t.color, t."usageCount",
                               (SELECT COUNT(*) FROM "PostTag" pt WHERE pt."tagId" = t.id) AS post_count
                        FROM "Tag" t
                        WHERE t.name ILIKE :query OR t.slug ILIKE :query OR t.description ILIKE :query
                        ORDER BY t."usageCount" DESC, t.name ASC LIMIT :limit OFFSET :offset
                        """)
                .param("query", "%" + normalized + "%")
                .param("limit", limit)
                .param("offset", offset)
                .query(this::searchTag)
                .list();
    }

    private long countTags(String query) {
        String normalized = query.replaceFirst("^#", "").trim();
        return jdbc.sql("""
                        SELECT COUNT(*) FROM "Tag"
                        WHERE name ILIKE :query OR slug ILIKE :query OR description ILIKE :query
                        """).param("query", "%" + normalized + "%").query(Long.class).single();
    }

    private String postProjection(boolean trending) {
        String score = trending
                ? "((SELECT COUNT(*) FROM \"Like\" score_likes WHERE score_likes.\"targetId\" = p.id AND score_likes.\"targetType\" = CAST('POST' AS \"LikeTargetType\")) * 2 + (SELECT COUNT(*) FROM \"Comment\" score_comments WHERE score_comments.\"postId\" = p.id) * 3) AS trending_score,"
                : "";
        return """
                SELECT p.id, p."authorId", p."communityId", p.content, p."isAnonymous",
                       p."imageUrl", p."imageUrls", p."videoUrls", p."viewsCount", p."xpAwarded",
                       p.status::text AS status, p.slug, p."metaTitle", p."metaDescription",
                       p.poll::text AS poll, p."createdAt", p."updatedAt",
                       u.id AS user_id, u.username, u."displayName", u.avatar, u.level,
                       u.role::text AS role,
                       (SELECT COUNT(*) FROM "Like" l WHERE l."targetId" = p.id
                            AND l."targetType" = CAST('POST' AS "LikeTargetType")) AS actual_likes,
                       (SELECT COUNT(*) FROM "Comment" comments WHERE comments."postId" = p.id) AS actual_comments,
                       %s
                       1 AS projection_end
                FROM "Post" p JOIN "User" u ON u.id = p."authorId"
                LEFT JOIN "Community" community ON community.id = p."communityId"
                """.formatted(score);
    }

    private String visibilityClause() {
        return """
                (CAST(:viewerId AS uuid) IS NULL OR NOT EXISTS (
                    SELECT 1 FROM "Block" b
                    WHERE (b."blockerId" = CAST(:viewerId AS uuid) AND b."blockedId" = p."authorId")
                       OR (b."blockerId" = p."authorId" AND b."blockedId" = CAST(:viewerId AS uuid))))
                AND (UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                    OR CAST(:viewerId AS uuid) = p."authorId"
                    OR EXISTS (SELECT 1 FROM "Follow" f
                        WHERE f."followerId" = CAST(:viewerId AS uuid) AND f."followingId" = p."authorId"))
                AND (COALESCE(community."isPrivate", false) = false
                    OR EXISTS (SELECT 1 FROM "CommunityMember" member
                        WHERE member."communityId" = p."communityId"
                          AND member."userId" = CAST(:viewerId AS uuid)))
                """;
    }

    private String userVisibilityClause() {
        return """
                (CAST(:viewerId AS uuid) IS NULL OR CAST(:viewerId AS uuid) = u.id OR NOT EXISTS (
                    SELECT 1 FROM "Block" b
                    WHERE (b."blockerId" = CAST(:viewerId AS uuid) AND b."blockedId" = u.id)
                       OR (b."blockerId" = u.id AND b."blockedId" = CAST(:viewerId AS uuid))))
                AND (UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                    OR CAST(:viewerId AS uuid) = u.id
                    OR EXISTS (SELECT 1 FROM "Follow" f
                        WHERE f."followerId" = CAST(:viewerId AS uuid) AND f."followingId" = u.id))
                """;
    }

    private String userSearchProjection() {
        return """
                SELECT u.id, u.username, u."displayName", u.avatar, u.level, u.points,
                       u.bio, u."techStack", u.interests
                FROM "User" u
                """;
    }

    private Map<String, Object> post(ResultSet rs, boolean trending) throws SQLException {
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
        if (!trending) author.put("role", rs.getString("role"));
        post.put("author", author);
        post.put("_count", Map.of("comments", rs.getLong("actual_comments")));
        if (trending) post.put("trendingScore", rs.getLong("trending_score"));
        return post;
    }

    private Map<String, Object> searchUser(ResultSet rs, int row) throws SQLException {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", uuid(rs, "id"));
        user.put("username", rs.getString("username"));
        user.put("displayName", rs.getString("displayName"));
        user.put("avatar", rs.getString("avatar"));
        user.put("level", rs.getInt("level"));
        user.put("points", rs.getInt("points"));
        user.put("bio", rs.getString("bio"));
        user.put("techStack", strings(rs, "techStack"));
        user.put("interests", strings(rs, "interests"));
        return user;
    }

    private Map<String, Object> searchTag(ResultSet rs, int row) throws SQLException {
        long count = rs.getLong("post_count");
        Map<String, Object> tag = new LinkedHashMap<>();
        tag.put("id", uuid(rs, "id"));
        tag.put("tag", rs.getString("name"));
        tag.put("name", rs.getString("name"));
        tag.put("slug", rs.getString("slug"));
        tag.put("description", rs.getString("description"));
        tag.put("color", rs.getString("color"));
        tag.put("count", count);
        tag.put("posts", count);
        tag.put("usageCount", rs.getInt("usageCount"));
        return tag;
    }

    private void attachTags(List<Map<String, Object>> posts) {
        for (Map<String, Object> post : posts) {
            List<Map<String, Object>> tags = jdbc.sql("""
                            SELECT pt."postId", pt."tagId", t.id, t.name, t.slug,
                                   t.description, t.color, t."usageCount", t."isOfficial",
                                   t."createdById", t."createdAt"
                            FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId"
                            WHERE pt."postId" = :postId
                            """)
                    .param("postId", post.get("id"))
                    .query((rs, row) -> {
                        Map<String, Object> tag = new LinkedHashMap<>();
                        tag.put("id", uuid(rs, "id"));
                        tag.put("name", rs.getString("name"));
                        tag.put("slug", rs.getString("slug"));
                        tag.put("description", rs.getString("description"));
                        tag.put("color", rs.getString("color"));
                        tag.put("usageCount", rs.getInt("usageCount"));
                        tag.put("isOfficial", rs.getBoolean("isOfficial"));
                        tag.put("createdById", uuid(rs, "createdById"));
                        tag.put("createdAt", instant(rs, "createdAt"));
                        return Map.of("postId", uuid(rs, "postId"), "tagId", uuid(rs, "tagId"), "tag", tag);
                    }).list();
            post.put("tags", tags);
        }
    }

    private List<Map<String, Object>> trendingTopics(List<Map<String, Object>> posts) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Map<String, Object> post : posts) {
            Matcher matcher = HASHTAG.matcher(String.valueOf(post.getOrDefault("content", "")));
            while (matcher.find()) counts.merge(matcher.group(1).toLowerCase(), 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .map(entry -> Map.<String, Object>of(
                        "tag", entry.getKey(), "posts", entry.getValue()))
                .sorted(Comparator.comparingInt(value -> -((Number) value.get("posts")).intValue()))
                .limit(10)
                .toList();
    }

    private List<Map<String, Object>> risingUsers(Instant cutoff) {
        return jdbc.sql("""
                        WITH candidates AS (
                            SELECT id FROM "User"
                            WHERE "updatedAt" >= :cutoff AND "isBlocked" = false
                            ORDER BY points DESC LIMIT 30
                        )
                        SELECT u.id, u.username, u."displayName", u.avatar, u.level, u.points,
                               (SELECT COUNT(*) FROM "Post" p
                                WHERE p."authorId" = u.id AND p."createdAt" >= :cutoff
                                  AND p.status = CAST('ACTIVE' AS "PostStatus")) AS posts_count
                        FROM "User" u JOIN candidates candidate ON candidate.id = u.id
                        WHERE UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                        ORDER BY u.points DESC LIMIT 10
                        """)
                .param("cutoff", Timestamp.from(cutoff))
                .query((rs, row) -> {
                    Map<String, Object> user = new LinkedHashMap<>();
                    user.put("id", uuid(rs, "id"));
                    user.put("username", rs.getString("username"));
                    user.put("displayName", rs.getString("displayName"));
                    user.put("avatar", rs.getString("avatar"));
                    user.put("level", rs.getInt("level"));
                    user.put("points", rs.getInt("points"));
                    user.put("postsCount", rs.getLong("posts_count"));
                    return user;
                }).list();
    }

    private Instant cutoff(String period) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        return switch (period) {
            case "today", "day" -> now.truncatedTo(ChronoUnit.DAYS).toInstant();
            case "month" -> now.minusMonths(1).toInstant();
            case "all" -> ZonedDateTime.of(2000, 1, 1, 0, 0, 0, 0, now.getZone()).toInstant();
            case "week" -> now.minusDays(7).toInstant();
            default -> now.minusDays(7).toInstant();
        };
    }

    private String normalizeType(String type) {
        return switch (type) {
            case "posts", "users", "tags", "all" -> type;
            default -> "all";
        };
    }

    private String formatNumber(long value) {
        if (value >= 1_000_000) return String.format(Locale.US, "%.1fM", value / 1_000_000d);
        if (value >= 1_000) return String.format(Locale.US, "%.1fK", value / 1_000d);
        return Long.toString(value);
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

    private Object json(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }
}
