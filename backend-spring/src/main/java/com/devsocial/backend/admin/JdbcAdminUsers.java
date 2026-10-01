package com.devsocial.backend.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcAdminUsers implements AdminUsers {
    private static final TypeReference<LinkedHashMap<String, Object>> JSON_OBJECT = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final AdminRolePolicy roles;

    public JdbcAdminUsers(JdbcClient jdbc, ObjectMapper objectMapper, AdminRolePolicy roles) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.roles = roles;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(UUID actorId, int page, int limit, String search) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        String filter = search == null || search.isBlank() ? "" : """
                 WHERE u.username ILIKE :search OR u.email ILIKE :search OR u."displayName" ILIKE :search
                """;
        JdbcClient.StatementSpec list = jdbc.sql("""
                SELECT u.id, u.username, u.email, u."displayName", u.role::text AS role,
                  u."isBlocked", u."isVerified", u."createdAt", u."lastActive", u.points, u.level,
                  u."followersCount", u."followingCount" FROM "User" u
                """ + filter + " ORDER BY u.\"createdAt\" DESC LIMIT :limit OFFSET :offset");
        JdbcClient.StatementSpec count = jdbc.sql("SELECT COUNT(*) FROM \"User\" u" + filter);
        if (!filter.isEmpty()) {
            String pattern = "%" + search + "%";
            list = list.param("search", pattern);
            count = count.param("search", pattern);
        }
        List<Map<String, Object>> values = list.param("limit", limit).param("offset", (page - 1) * limit)
                .query(this::summary).list();
        long total = count.query(Long.class).single();
        return map("data", values, "meta", map("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit)));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findOne(UUID actorId, UUID userId) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        String json = jdbc.sql("SELECT row_to_json(u)::text FROM \"User\" u WHERE u.id = :id")
                .param("id", userId).query(String.class).optional().orElseThrow(this::notFound);
        Map<String, Object> user = jsonObject(json);
        List<Map<String, Object>> posts = jdbc.sql("""
                        SELECT id, content, "createdAt", "likesCount", "commentsCount", status::text AS status
                        FROM "Post" WHERE "authorId" = :id ORDER BY "createdAt" DESC LIMIT 10
                        """).param("id", userId).query((rs, row) -> mapNullable(
                        "id", rs.getObject("id", UUID.class), "content", rs.getString("content"),
                        "createdAt", instant(rs, "createdAt"), "likesCount", rs.getInt("likesCount"),
                        "commentsCount", rs.getInt("commentsCount"), "status", rs.getString("status"))).list();
        Counts counts = jdbc.sql("""
                        SELECT (SELECT COUNT(*) FROM "Post" WHERE "authorId" = :id) AS posts,
                          (SELECT COUNT(*) FROM "Comment" WHERE "authorId" = :id) AS comments,
                          (SELECT COUNT(*) FROM "Like" WHERE "userId" = :id) AS likes
                        """).param("id", userId).query((rs, row) -> new Counts(
                        rs.getLong("posts"), rs.getLong("comments"), rs.getLong("likes"))).single();
        user.put("posts", posts);
        user.put("_count", map("posts", counts.posts(), "comments", counts.comments(), "likes", counts.likes()));
        return user;
    }

    private Map<String, Object> summary(ResultSet rs, int row) throws SQLException {
        return mapNullable("id", rs.getObject("id", UUID.class), "username", rs.getString("username"),
                "email", rs.getString("email"), "displayName", rs.getString("displayName"),
                "role", rs.getString("role"), "isBlocked", rs.getBoolean("isBlocked"),
                "isVerified", rs.getBoolean("isVerified"), "createdAt", instant(rs, "createdAt"),
                "lastActive", instant(rs, "lastActive"), "points", rs.getInt("points"),
                "level", rs.getInt("level"), "followersCount", rs.getInt("followersCount"),
                "followingCount", rs.getInt("followingCount"));
    }

    private Map<String, Object> jsonObject(String value) {
        try {
            return objectMapper.readValue(value, JSON_OBJECT);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Database user JSON is not valid", exception);
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

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }

    private record Counts(long posts, long comments, long likes) { }
}
