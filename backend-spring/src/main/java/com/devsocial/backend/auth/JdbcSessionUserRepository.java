package com.devsocial.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcSessionUserRepository implements SessionUserRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcSessionUserRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<String> findEmailByUsername(String username) {
        return jdbc.sql("SELECT email FROM \"User\" WHERE username = :username LIMIT 1")
                .param("username", username).query(String.class).optional();
    }

    @Override
    public Optional<SessionUser> findBySupabaseUserId(UUID supabaseUserId) {
        return jdbc.sql("SELECT * FROM \"User\" WHERE \"supabaseAuthId\" = :supabaseUserId LIMIT 1")
                .param("supabaseUserId", supabaseUserId.toString())
                .query((resultSet, rowNumber) -> {
                    Map<String, Object> profile = normalize(new ColumnMapRowMapper().mapRow(resultSet, rowNumber));
                    UUID id = UUID.fromString(String.valueOf(profile.get("id")));
                    return new SessionUser(id, Boolean.TRUE.equals(profile.get("isBlocked")), profile);
                }).optional();
    }

    @Override
    public void recordLogin(UUID userId) {
        jdbc.sql("UPDATE \"User\" SET \"lastLogin\" = NOW(), \"lastActive\" = NOW() WHERE id = :userId")
                .param("userId", userId).update();
    }

    @Override
    public void recordActivity(UUID userId) {
        jdbc.sql("UPDATE \"User\" SET \"lastActive\" = NOW() WHERE id = :userId")
                .param("userId", userId).update();
    }

    private Map<String, Object> normalize(Map<String, Object> raw) throws SQLException {
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            normalized.put(entry.getKey(), normalizeValue(entry.getValue()));
        }
        return normalized;
    }

    private Object normalizeValue(Object value) throws SQLException {
        if (value instanceof Array array) {
            Object items = array.getArray();
            return items instanceof Object[] values ? new ArrayList<>(List.of(values)) : List.of();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value != null && value.getClass().getName().equals("org.postgresql.util.PGobject")) {
            try {
                return objectMapper.readValue(value.toString(), Object.class);
            } catch (Exception ignored) {
                return value.toString();
            }
        }
        return value;
    }
}
