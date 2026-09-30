package com.devsocial.backend.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
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
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcAdminContentModeration implements AdminContentModeration {
    private static final TypeReference<Object> JSON_VALUE = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final AdminRolePolicy roles;

    public JdbcAdminContentModeration(JdbcClient jdbc, ObjectMapper objectMapper, AdminRolePolicy roles) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.roles = roles;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findPosts(UUID actorId, String status, int page, int limit) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        String filter = status == null ? "" : " WHERE p.status = CAST(:status AS \"PostStatus\")";
        JdbcClient.StatementSpec list = jdbc.sql(postProjection() + filter
                + " ORDER BY p.\"createdAt\" DESC LIMIT :limit OFFSET :offset");
        JdbcClient.StatementSpec count = jdbc.sql("SELECT COUNT(*) FROM \"Post\" p" + filter);
        if (status != null) {
            list = list.param("status", status);
            count = count.param("status", status);
        }
        List<Map<String, Object>> posts = list.param("limit", limit).param("offset", (page - 1) * limit)
                .query(this::post).list();
        long total = count.query(Long.class).single();
        return map("data", posts, "meta", map("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit)));
    }

    @Override
    @Transactional
    public Map<String, Object> updatePostStatus(UUID actorId, UUID postId,
            UpdateAdminPostStatusRequest request) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        String previous = jdbc.sql("SELECT status::text FROM \"Post\" WHERE id = :id FOR UPDATE")
                .param("id", postId).query(String.class).optional().orElseThrow(this::postNotFound);
        Map<String, Object> updated = jdbc.sql("""
                        UPDATE "Post" SET status = CAST(:status AS "PostStatus"), "updatedAt" = now()
                        WHERE id = :id RETURNING id, "authorId", "communityId", content, "isAnonymous",
                          "imageUrl", "imageUrls", "videoUrls", "likesCount", "commentsCount", "viewsCount",
                          "xpAwarded", status::text AS status, slug, "metaTitle", "metaDescription", poll,
                          "createdAt", "updatedAt"
                        """).param("status", request.status()).param("id", postId)
                .query(this::postWithoutAuthor).single();
        audit(actorId, "POST_STATUS_UPDATE", postId, request.reason(),
                map("oldStatus", previous, "newStatus", request.status()));
        return updated;
    }

    @Override
    @Transactional
    public Map<String, Object> deletePost(UUID actorId, UUID postId, String reason) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        jdbc.sql("SELECT id FROM \"Post\" WHERE id = :id FOR UPDATE").param("id", postId)
                .query(UUID.class).optional().orElseThrow(this::postNotFound);
        jdbc.sql("DELETE FROM \"Post\" WHERE id = :id").param("id", postId).update();
        audit(actorId, "POST_DELETE", postId, reason, null);
        return map("message", "Post deleted successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAuditLogs(UUID actorId, int page, int limit) {
        roles.require(actorId, AdminRolePolicy.ADMIN_ONLY);
        List<Map<String, Object>> logs = jdbc.sql("""
                        SELECT id, "adminId", action, "targetType", "targetId", reason, metadata, "createdAt"
                        FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT :limit OFFSET :offset
                        """).param("limit", limit).param("offset", (page - 1) * limit)
                .query(this::auditLog).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"AuditLog\"").query(Long.class).single();
        return map("data", logs, "meta", map("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit)));
    }

    private String postProjection() {
        return """
                SELECT p.id, p."authorId", p."communityId", p.content, p."isAnonymous", p."imageUrl",
                  p."imageUrls", p."videoUrls", p."likesCount", p."commentsCount", p."viewsCount",
                  p."xpAwarded", p.status::text AS status, p.slug, p."metaTitle", p."metaDescription",
                  p.poll, p."createdAt", p."updatedAt", u.id AS author_id, u.username AS author_username,
                  u."displayName" AS author_display_name
                FROM "Post" p JOIN "User" u ON u.id = p."authorId"
                """;
    }

    private Map<String, Object> post(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = postWithoutAuthor(rs, row);
        result.put("author", mapNullable("id", rs.getObject("author_id", UUID.class),
                "username", rs.getString("author_username"), "displayName", rs.getString("author_display_name")));
        return result;
    }

    private Map<String, Object> postWithoutAuthor(ResultSet rs, int row) throws SQLException {
        return mapNullable("id", rs.getObject("id", UUID.class),
                "authorId", rs.getObject("authorId", UUID.class),
                "communityId", rs.getObject("communityId", UUID.class), "content", rs.getString("content"),
                "isAnonymous", rs.getBoolean("isAnonymous"), "imageUrl", rs.getString("imageUrl"),
                "imageUrls", strings(rs, "imageUrls"), "videoUrls", strings(rs, "videoUrls"),
                "likesCount", rs.getInt("likesCount"), "commentsCount", rs.getInt("commentsCount"),
                "viewsCount", rs.getInt("viewsCount"), "xpAwarded", rs.getInt("xpAwarded"),
                "status", rs.getString("status"), "slug", rs.getString("slug"),
                "metaTitle", rs.getString("metaTitle"), "metaDescription", rs.getString("metaDescription"),
                "poll", jsonValue(rs.getString("poll")), "createdAt", instant(rs, "createdAt"),
                "updatedAt", instant(rs, "updatedAt"));
    }

    private Map<String, Object> auditLog(ResultSet rs, int row) throws SQLException {
        return mapNullable("id", rs.getObject("id", UUID.class),
                "adminId", rs.getObject("adminId", UUID.class), "action", rs.getString("action"),
                "targetType", rs.getString("targetType"), "targetId", rs.getObject("targetId", UUID.class),
                "reason", rs.getString("reason"), "metadata", jsonValue(rs.getString("metadata")),
                "createdAt", instant(rs, "createdAt"));
    }

    private void audit(UUID actorId, String action, UUID postId, String reason, Object metadata) {
        jdbc.sql("""
                        INSERT INTO "AuditLog" (id, "adminId", action, "targetType", "targetId", reason,
                          metadata, "createdAt") VALUES (:id, :actorId, :action, 'POST', :postId, :reason,
                          CAST(:metadata AS jsonb), now())
                        """).param("id", UUID.randomUUID()).param("actorId", actorId).param("action", action)
                .param("postId", postId).param("reason", reason, Types.VARCHAR)
                .param("metadata", metadata == null ? null : json(metadata), Types.VARCHAR).update();
    }

    private List<String> strings(ResultSet rs, String column) throws SQLException {
        Array array = rs.getArray(column);
        if (array == null) return List.of();
        Object[] values = (Object[]) array.getArray();
        List<String> result = new ArrayList<>(values.length);
        for (Object value : values) result.add(String.valueOf(value));
        return result;
    }

    private Object jsonValue(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, JSON_VALUE);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Database JSON is not valid", exception);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit metadata is not valid JSON", exception);
        }
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private Map<String, Object> map(Object... values) { return mapNullable(values); }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException postNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }
}
