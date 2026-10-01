package com.devsocial.backend.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Types;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcAdminUserModeration implements AdminUserModeration {
    private static final TypeReference<LinkedHashMap<String, Object>> JSON_OBJECT = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final AdminRolePolicy roles;

    public JdbcAdminUserModeration(JdbcClient jdbc, ObjectMapper objectMapper, AdminRolePolicy roles) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.roles = roles;
    }

    @Override
    @Transactional
    public Map<String, Object> updateRole(UUID actorId, UUID userId, String role) {
        roles.require(actorId, AdminRolePolicy.ADMIN_ONLY);
        String previous = currentRole(userId);
        Map<String, Object> updated = update(userId, "role = CAST(:value AS \"UserRole\")", role);
        audit(actorId, "USER_ROLE_CHANGE", userId, "Role changed from " + previous + " to " + role, null);
        return updated;
    }

    @Override
    @Transactional
    public Map<String, Object> ban(UUID actorId, UUID userId, BanAdminUserRequest request) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        if ("ADMIN".equals(currentRole(userId)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot ban an admin user");
        Map<String, Object> updated = update(userId, "\"isBlocked\" = :value", true);
        audit(actorId, "USER_BAN", userId, request.reason(), map("permanent", request.permanent()));
        return updated;
    }

    @Override
    @Transactional
    public Map<String, Object> unban(UUID actorId, UUID userId) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        currentRole(userId);
        Map<String, Object> updated = update(userId, "\"isBlocked\" = :value", false);
        audit(actorId, "USER_UNBAN", userId, null, null);
        return updated;
    }

    private String currentRole(UUID userId) {
        return jdbc.sql("SELECT role::text FROM \"User\" WHERE id = :id FOR UPDATE")
                .param("id", userId).query(String.class).optional().orElseThrow(this::notFound);
    }

    private Map<String, Object> update(UUID userId, String assignment, Object value) {
        String json = jdbc.sql("UPDATE \"User\" SET " + assignment
                        + ", \"updatedAt\" = now() WHERE id = :id RETURNING row_to_json(\"User\")::text")
                .param("value", value).param("id", userId).query(String.class).single();
        return jsonObject(json);
    }

    private void audit(UUID actorId, String action, UUID userId, String reason, Object metadata) {
        jdbc.sql("""
                        INSERT INTO "AuditLog" (id, "adminId", action, "targetType", "targetId", reason,
                          metadata, "createdAt") VALUES (:id, :actorId, :action, 'USER', :userId, :reason,
                          CAST(:metadata AS jsonb), now())
                        """).param("id", UUID.randomUUID()).param("actorId", actorId).param("action", action)
                .param("userId", userId).param("reason", reason, Types.VARCHAR)
                .param("metadata", metadata == null ? null : json(metadata), Types.VARCHAR).update();
    }

    private Map<String, Object> jsonObject(String value) {
        try {
            return objectMapper.readValue(value, JSON_OBJECT);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Database user JSON is not valid", exception);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit metadata is not valid JSON", exception);
        }
    }

    private Map<String, Object> map(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }
}
