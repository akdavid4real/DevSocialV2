package com.devsocial.backend.content;

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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcContentQueries implements ContentQueries {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcContentQueries(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Object feed(Optional<UUID> viewerId, int page, int limit, String search) {
        int offset = (page - 1) * limit;
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("viewerId", viewerId.orElse(null));
        parameters.put("limit", search == null || search.isBlank() ? limit : 50);
        parameters.put("offset", search == null || search.isBlank() ? offset : 0);
        String filter = "p.status = CAST('ACTIVE' AS \"PostStatus\")";
        if (search != null && !search.isBlank()) {
            filter += " AND (p.content ILIKE :search OR u.username ILIKE :search OR u.\"displayName\" ILIKE :search)";
            parameters.put("search", "%" + search + "%");
        }

        List<Map<String, Object>> posts = queryCandidatePosts(filter, "", parameters, true);
        if (search != null && !search.isBlank()) return posts;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("posts", posts);
        result.put("total", offset + posts.size());
        result.put("page", page);
        result.put("lastPage", posts.size() == limit ? page + 1 : page);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> tagged(Optional<UUID> viewerId, String tagName, int page, int limit) {
        String normalized = tagName.replaceFirst("^#", "").trim().toLowerCase();
        if (normalized.isBlank()) throw badRequest("Tag name is required");

        Map<String, Object> tag = jdbc.sql("""
                        SELECT id, name, slug, "usageCount", description, color
                        FROM "Tag" WHERE slug = :tag OR LOWER(name) = :tag LIMIT 1
                        """)
                .param("tag", normalized)
                .query((rs, row) -> tag(rs))
                .optional()
                .orElse(null);
        if (tag == null) {
            Map<String, Object> missing = new LinkedHashMap<>();
            missing.put("name", normalized);
            missing.put("slug", normalized);
            missing.put("usageCount", 0);
            missing.put("description", null);
            missing.put("color", "#3b82f6");
            return pageResult(missing, List.of(), 0, page, 0);
        }

        int offset = (page - 1) * limit;
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("viewerId", viewerId.orElse(null));
        parameters.put("tagId", tag.get("id"));
        parameters.put("limit", limit);
        parameters.put("offset", offset);
        List<Map<String, Object>> posts = queryCandidatePosts(
                "p.status = CAST('ACTIVE' AS \"PostStatus\")",
                "JOIN \"PostTag\" candidate_tag ON candidate_tag.\"postId\" = p.id AND candidate_tag.\"tagId\" = :tagId",
                parameters,
                true
        );
        attachTags(posts);
        int total = offset + posts.size();
        return pageResult(tag, posts, total, page, posts.size() == limit ? page + 1 : page);
    }

    @Override
    @Transactional
    public Map<String, Object> post(
            UUID postId,
            Optional<UUID> viewerId,
            String ipAddress,
            String userAgent
    ) {
        UUID viewer = viewerId.orElse(null);
        if (!visiblePost(postId, viewer)) throw notFound("Post not found");
        trackUniqueView(postId, viewer, ipAddress, userAgent);

        return queryOnePost(postId, viewer)
                .orElseThrow(() -> notFound("Post not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> comments(UUID postId, Optional<UUID> viewerId, int page, int limit) {
        if (!visiblePost(postId, viewerId.orElse(null))) throw notFound("Post not found");
        int offset = (page - 1) * limit;
        List<Map<String, Object>> comments = jdbc.sql(commentProjection() + """
                        WHERE c."postId" = :postId AND c."parentId" IS NULL
                        ORDER BY c."createdAt" DESC LIMIT :limit OFFSET :offset
                        """)
                .param("viewerId", viewerId.orElse(null))
                .param("postId", postId)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::comment)
                .list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"Comment\" WHERE \"postId\" = :postId AND \"parentId\" IS NULL")
                .param("postId", postId).query(Long.class).single();
        int lastPage = (int) Math.ceil((double) total / limit);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("comments", comments);
        result.put("total", total);
        result.put("page", page);
        result.put("lastPage", lastPage);
        result.put("hasMore", page < lastPage);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> replies(UUID commentId, Optional<UUID> viewerId, int page, int limit) {
        UUID postId = jdbc.sql("SELECT \"postId\" FROM \"Comment\" WHERE id = :commentId")
                .param("commentId", commentId)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> notFound("Comment not found"));
        if (!visiblePost(postId, viewerId.orElse(null))) throw notFound("Post not found");

        int offset = (page - 1) * limit;
        List<Map<String, Object>> replies = jdbc.sql(commentProjection() + """
                        WHERE c."parentId" = :commentId
                        ORDER BY c."createdAt" ASC LIMIT :limit OFFSET :offset
                        """)
                .param("viewerId", viewerId.orElse(null))
                .param("commentId", commentId)
                .param("limit", limit)
                .param("offset", offset)
                .query(this::comment)
                .list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"Comment\" WHERE \"parentId\" = :commentId")
                .param("commentId", commentId).query(Long.class).single();
        int lastPage = (int) Math.ceil((double) total / limit);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("replies", replies);
        result.put("total", total);
        result.put("page", page);
        result.put("lastPage", lastPage);
        result.put("hasMore", page < lastPage);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Object userPosts(String username, Optional<UUID> viewerId) {
        UUID userId = visibleUser(username, viewerId.orElse(null));
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("viewerId", viewerId.orElse(null));
        parameters.put("userId", userId);
        parameters.put("limit", 100);
        parameters.put("offset", 0);
        return queryCandidatePosts("p.\"authorId\" = :userId", "", parameters, false);
    }

    private List<Map<String, Object>> queryCandidatePosts(
            String candidateFilter,
            String candidateJoin,
            Map<String, Object> parameters,
            boolean enforceVisibility
    ) {
        String sql = """
                WITH candidates AS (
                    SELECT p.id
                    FROM "Post" p
                    JOIN "User" u ON u.id = p."authorId"
                    %s
                    WHERE %s
                    ORDER BY p."createdAt" DESC
                    LIMIT :limit OFFSET :offset
                )
                %s
                JOIN candidates selected ON selected.id = p.id
                WHERE 1 = 1 %s
                ORDER BY p."createdAt" DESC
                """.formatted(
                candidateJoin,
                candidateFilter,
                postProjection(),
                enforceVisibility ? "AND " + visibilityClause() : ""
        );
        JdbcClient.StatementSpec statement = jdbc.sql(sql);
        for (Map.Entry<String, Object> parameter : parameters.entrySet()) {
            statement = statement.param(parameter.getKey(), parameter.getValue());
        }
        return statement.query(this::post).list();
    }

    private Optional<Map<String, Object>> queryOnePost(UUID postId, UUID viewerId) {
        return jdbc.sql(postProjection() + " WHERE p.id = :postId")
                .param("postId", postId)
                .param("viewerId", viewerId)
                .query(this::post)
                .optional();
    }

    private boolean visiblePost(UUID postId, UUID viewerId) {
        return jdbc.sql("""
                        SELECT EXISTS(
                            SELECT 1 FROM "Post" p
                            JOIN "User" u ON u.id = p."authorId"
                            LEFT JOIN "Community" community ON community.id = p."communityId"
                            WHERE p.id = :postId
                              AND p.status = CAST('ACTIVE' AS "PostStatus")
                              AND %s
                        )
                        """.formatted(visibilityClause()))
                .param("postId", postId)
                .param("viewerId", viewerId)
                .query(Boolean.class).single();
    }

    private UUID visibleUser(String username, UUID viewerId) {
        return jdbc.sql("""
                        SELECT u.id FROM "User" u
                        WHERE LOWER(u.username) = LOWER(:username)
                          AND (
                            CAST(:viewerId AS uuid) IS NULL
                            OR CAST(:viewerId AS uuid) = u.id
                            OR NOT EXISTS (
                                SELECT 1 FROM "Block" b
                                WHERE (b."blockerId" = CAST(:viewerId AS uuid) AND b."blockedId" = u.id)
                                   OR (b."blockerId" = u.id AND b."blockedId" = CAST(:viewerId AS uuid))
                            )
                          )
                          AND (
                            UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                            OR CAST(:viewerId AS uuid) = u.id
                            OR EXISTS (
                                SELECT 1 FROM "Follow" f
                                WHERE f."followerId" = CAST(:viewerId AS uuid) AND f."followingId" = u.id
                            )
                          )
                        LIMIT 1
                        """)
                .param("username", username)
                .param("viewerId", viewerId)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> notFound("User @" + username + " not found"));
    }

    private String postProjection() {
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
                       EXISTS(SELECT 1 FROM "Like" own_like
                            WHERE own_like."targetId" = p.id
                              AND own_like."targetType" = CAST('POST' AS "LikeTargetType")
                              AND own_like."userId" = CAST(:viewerId AS uuid)) AS is_liked
                FROM "Post" p
                JOIN "User" u ON u.id = p."authorId"
                LEFT JOIN "Community" community ON community.id = p."communityId"
                """;
    }

    private String visibilityClause() {
        return """
                (
                    CAST(:viewerId AS uuid) IS NULL
                    OR NOT EXISTS (
                        SELECT 1 FROM "Block" b
                        WHERE (b."blockerId" = CAST(:viewerId AS uuid) AND b."blockedId" = p."authorId")
                           OR (b."blockerId" = p."authorId" AND b."blockedId" = CAST(:viewerId AS uuid))
                    )
                )
                AND (
                    UPPER(COALESCE(u."privacySettings"->>'profileVisibility', 'PUBLIC')) <> 'PRIVATE'
                    OR CAST(:viewerId AS uuid) = p."authorId"
                    OR EXISTS (
                        SELECT 1 FROM "Follow" f
                        WHERE f."followerId" = CAST(:viewerId AS uuid) AND f."followingId" = p."authorId"
                    )
                )
                AND (
                    COALESCE(community."isPrivate", false) = false
                    OR EXISTS (
                        SELECT 1 FROM "CommunityMember" member
                        WHERE member."communityId" = p."communityId"
                          AND member."userId" = CAST(:viewerId AS uuid)
                    )
                )
                """;
    }

    private String commentProjection() {
        return """
                SELECT c.id, c."authorId", c."postId", c."parentId", c.content,
                       c."imageUrls", c."videoUrls", c."likesCount", c."createdAt", c."updatedAt",
                       u.id AS user_id, u.username, u."displayName", u.avatar, u.level,
                       (SELECT COUNT(*) FROM "Comment" reply WHERE reply."parentId" = c.id) AS reply_count,
                       EXISTS(SELECT 1 FROM "Like" own_like
                            WHERE own_like."targetId" = c.id
                              AND own_like."targetType" = CAST('COMMENT' AS "LikeTargetType")
                              AND own_like."userId" = CAST(:viewerId AS uuid)) AS is_liked
                FROM "Comment" c JOIN "User" u ON u.id = c."authorId"
                """;
    }

    private Map<String, Object> post(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", uuid(rs, "id"));
        result.put("authorId", uuid(rs, "authorId"));
        result.put("communityId", uuid(rs, "communityId"));
        result.put("content", rs.getString("content"));
        result.put("isAnonymous", rs.getBoolean("isAnonymous"));
        result.put("imageUrl", rs.getString("imageUrl"));
        result.put("imageUrls", strings(rs, "imageUrls"));
        result.put("videoUrls", strings(rs, "videoUrls"));
        result.put("likesCount", rs.getLong("actual_likes"));
        result.put("commentsCount", rs.getLong("actual_comments"));
        result.put("viewsCount", rs.getInt("viewsCount"));
        result.put("xpAwarded", rs.getInt("xpAwarded"));
        result.put("status", rs.getString("status"));
        result.put("slug", rs.getString("slug"));
        result.put("metaTitle", rs.getString("metaTitle"));
        result.put("metaDescription", rs.getString("metaDescription"));
        result.put("poll", json(rs.getString("poll")));
        result.put("createdAt", instant(rs, "createdAt"));
        result.put("updatedAt", instant(rs, "updatedAt"));
        result.put("author", author(rs, true));
        result.put("_count", Map.of("comments", rs.getLong("actual_comments")));
        result.put("isLiked", rs.getBoolean("is_liked"));
        return result;
    }

    private Map<String, Object> comment(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", uuid(rs, "id"));
        result.put("authorId", uuid(rs, "authorId"));
        result.put("postId", uuid(rs, "postId"));
        result.put("parentId", uuid(rs, "parentId"));
        result.put("content", rs.getString("content"));
        result.put("imageUrls", strings(rs, "imageUrls"));
        result.put("videoUrls", strings(rs, "videoUrls"));
        result.put("likesCount", rs.getInt("likesCount"));
        result.put("createdAt", instant(rs, "createdAt"));
        result.put("updatedAt", instant(rs, "updatedAt"));
        result.put("author", author(rs, false));
        int replies = rs.getInt("reply_count");
        result.put("_count", Map.of("replies", replies));
        result.put("repliesCount", replies);
        result.put("isLiked", rs.getBoolean("is_liked"));
        return result;
    }

    private Map<String, Object> author(ResultSet rs, boolean includeRole) throws SQLException {
        Map<String, Object> author = new LinkedHashMap<>();
        author.put("id", uuid(rs, "user_id"));
        author.put("username", rs.getString("username"));
        author.put("displayName", rs.getString("displayName"));
        author.put("avatar", rs.getString("avatar"));
        author.put("level", rs.getInt("level"));
        if (includeRole) author.put("role", rs.getString("role"));
        return author;
    }

    private Map<String, Object> tag(ResultSet rs) throws SQLException {
        Map<String, Object> tag = new LinkedHashMap<>();
        tag.put("id", uuid(rs, "id"));
        tag.put("name", rs.getString("name"));
        tag.put("slug", rs.getString("slug"));
        tag.put("usageCount", rs.getInt("usageCount"));
        tag.put("description", rs.getString("description"));
        tag.put("color", rs.getString("color"));
        return tag;
    }

    private void attachTags(List<Map<String, Object>> posts) {
        for (Map<String, Object> post : posts) {
            UUID postId = (UUID) post.get("id");
            List<Map<String, Object>> tags = jdbc.sql("""
                            SELECT pt."postId", pt."tagId", t.id, t.name, t.slug,
                                   t.description, t.color, t."usageCount", t."isOfficial",
                                   t."createdById", t."createdAt"
                            FROM "PostTag" pt JOIN "Tag" t ON t.id = pt."tagId"
                            WHERE pt."postId" = :postId
                            """)
                    .param("postId", postId)
                    .query((rs, row) -> {
                        Map<String, Object> relation = new LinkedHashMap<>();
                        relation.put("postId", uuid(rs, "postId"));
                        relation.put("tagId", uuid(rs, "tagId"));
                        Map<String, Object> fullTag = tag(rs);
                        fullTag.put("isOfficial", rs.getBoolean("isOfficial"));
                        fullTag.put("createdById", uuid(rs, "createdById"));
                        fullTag.put("createdAt", instant(rs, "createdAt"));
                        relation.put("tag", fullTag);
                        return relation;
                    }).list();
            post.put("tags", tags);
        }
    }

    private void trackUniqueView(UUID postId, UUID viewerId, String ipAddress, String userAgent) {
        String identity = viewerId == null ? "ip:" + ipAddress : "user:" + viewerId;
        jdbc.sql("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(:lockKey))) lock")
                .param("lockKey", "post-view:" + postId + ":" + identity)
                .query(Integer.class).single();
        long existing = viewerId == null
                ? jdbc.sql("SELECT COUNT(*) FROM \"View\" WHERE \"postId\" = :postId AND \"userId\" IS NULL AND \"ipAddress\" = :ip")
                    .param("postId", postId).param("ip", ipAddress).query(Long.class).single()
                : jdbc.sql("SELECT COUNT(*) FROM \"View\" WHERE \"postId\" = :postId AND \"userId\" = :viewerId")
                    .param("postId", postId).param("viewerId", viewerId).query(Long.class).single();
        if (existing > 0) return;
        jdbc.sql("""
                        INSERT INTO "View" (id, "postId", "userId", "ipAddress", "userAgent")
                        VALUES (:id, :postId, :viewerId, :ip, :userAgent)
                        """)
                .param("id", UUID.randomUUID()).param("postId", postId).param("viewerId", viewerId)
                .param("ip", ipAddress).param("userAgent", userAgent).update();
        jdbc.sql("UPDATE \"Post\" SET \"viewsCount\" = \"viewsCount\" + 1, \"updatedAt\" = now() WHERE id = :postId")
                .param("postId", postId).update();
    }

    private Map<String, Object> pageResult(
            Map<String, Object> tag,
            List<Map<String, Object>> posts,
            int total,
            int page,
            int lastPage
    ) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tag", tag);
        result.put("posts", posts);
        result.put("total", total);
        result.put("page", page);
        result.put("lastPage", lastPage);
        return result;
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

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
