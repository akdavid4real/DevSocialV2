package com.devsocial.backend.users;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
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
public class JdbcUserRepository implements UserRepository {
    private static final Map<String, String> UPDATE_EXPRESSIONS = Map.ofEntries(
            Map.entry("displayName", "\"displayName\" = :displayName"),
            Map.entry("bio", "bio = :bio"),
            Map.entry("avatar", "avatar = :avatar"),
            Map.entry("bannerUrl", "\"bannerUrl\" = :bannerUrl"),
            Map.entry("location", "location = :location"),
            Map.entry("website", "website = :website"),
            Map.entry("githubUsername", "\"githubUsername\" = :githubUsername"),
            Map.entry("linkedinUrl", "\"linkedinUrl\" = :linkedinUrl"),
            Map.entry("portfolioUrl", "\"portfolioUrl\" = :portfolioUrl"),
            Map.entry("affiliation", "affiliation = :affiliation"),
            Map.entry("techCareerPath", "\"techCareerPath\" = :techCareerPath"),
            Map.entry("techStack", "\"techStack\" = ARRAY(SELECT jsonb_array_elements_text(CAST(:techStack AS jsonb)))"),
            Map.entry("interests", "interests = ARRAY(SELECT jsonb_array_elements_text(CAST(:interests AS jsonb)))"),
            Map.entry("badges", "badges = ARRAY(SELECT jsonb_array_elements_text(CAST(:badges AS jsonb)))"),
            Map.entry("experienceLevel", "\"experienceLevel\" = CAST(:experienceLevel AS \"ExperienceLevel\")"),
            Map.entry("gender", "gender = CAST(:gender AS \"Gender\")"),
            Map.entry("onboardingCompleted", "\"onboardingCompleted\" = :onboardingCompleted")
    );
    private static final List<String> ARRAY_FIELDS = List.of("techStack", "interests", "badges");

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcUserRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<Map<String, Object>> findFull(UUID userId) {
        return queryOne("SELECT * FROM \"User\" WHERE id = :userId LIMIT 1", Map.of("userId", userId));
    }

    @Override
    public Optional<Map<String, Object>> findPublicByUsername(String username) {
        return queryOne("""
                        SELECT id, username, "displayName", bio, avatar, "bannerUrl", affiliation,
                               "techStack", interests, "experienceLevel", points, level, badges,
                               location, website, "githubUsername", "linkedinUrl", "createdAt",
                               "followersCount", "followingCount"
                        FROM "User"
                        WHERE LOWER(username) = LOWER(:username)
                        LIMIT 1
                        """, Map.of("username", username));
    }

    @Override
    public Optional<Map<String, Object>> findOnboarding(UUID userId) {
        return queryOne("""
                        SELECT "onboardingCompleted", gender, bio, avatar, "techCareerPath",
                               "techStack", "experienceLevel", interests, affiliation
                        FROM "User"
                        WHERE id = :userId
                        LIMIT 1
                        """, Map.of("userId", userId));
    }

    @Override
    public Map<String, Object> updateFields(UUID userId, Map<String, Object> fields) {
        if (fields.isEmpty()) {
            return findFull(userId).orElseThrow();
        }

        List<String> assignments = new ArrayList<>();
        MapSqlParameterSource parameters = new MapSqlParameterSource().addValue("userId", userId);
        for (Map.Entry<String, Object> field : fields.entrySet()) {
            String expression = UPDATE_EXPRESSIONS.get(field.getKey());
            if (expression == null) {
                continue;
            }
            assignments.add(expression);
            Object value = ARRAY_FIELDS.contains(field.getKey()) ? json(field.getValue()) : field.getValue();
            parameters.addValue(field.getKey(), value);
        }
        if (assignments.isEmpty()) {
            return findFull(userId).orElseThrow();
        }
        assignments.add("\"updatedAt\" = NOW()");
        jdbc.sql("UPDATE \"User\" SET " + String.join(", ", assignments) + " WHERE id = :userId")
                .paramSource(parameters)
                .update();
        return findFull(userId).orElseThrow();
    }

    @Override
    public List<Map<String, Object>> search(String query, int limit) {
        return queryList("""
                        SELECT id, username, "displayName", avatar, level, points, bio
                        FROM "User"
                        WHERE username ILIKE :query OR "displayName" ILIKE :query OR bio ILIKE :query
                        LIMIT :limit
                        """, Map.of("query", "%" + query + "%", "limit", limit));
    }

    @Override
    public List<Map<String, Object>> leaderboard(String period, int limit) {
        String dateClause = switch (period) {
            case "week" -> "WHERE \"createdAt\" >= NOW() - INTERVAL '7 days'";
            case "month" -> "WHERE \"createdAt\" >= NOW() - INTERVAL '1 month'";
            default -> "";
        };
        return queryList("""
                        SELECT id, username, "displayName", avatar, level, points
                        FROM "User"
                        """ + dateClause + " ORDER BY points DESC, level DESC LIMIT :limit", Map.of("limit", limit));
    }

    @Override
    public Map<String, Object> readJsonSettings(UUID userId, String field) {
        String column = settingsColumn(field);
        String value = jdbc.sql("SELECT COALESCE(" + column + ", '{}'::jsonb)::text FROM \"User\" WHERE id = :userId")
                .param("userId", userId)
                .query(String.class)
                .optional()
                .orElse("{}");
        try {
            return objectMapper.readValue(value, objectMapper.getTypeFactory()
                    .constructMapType(LinkedHashMap.class, String.class, Object.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Invalid stored settings", exception);
        }
    }

    @Override
    public void writeJsonSettings(UUID userId, String field, Map<String, Object> settings) {
        String column = settingsColumn(field);
        jdbc.sql("UPDATE \"User\" SET " + column + " = CAST(:settings AS jsonb), \"updatedAt\" = NOW() WHERE id = :userId")
                .param("settings", json(settings))
                .param("userId", userId)
                .update();
    }

    private Optional<Map<String, Object>> queryOne(String sql, Map<String, ?> parameters) {
        JdbcClient.StatementSpec statement = jdbc.sql(sql);
        for (Map.Entry<String, ?> parameter : parameters.entrySet()) {
            statement = statement.param(parameter.getKey(), parameter.getValue());
        }
        return statement.query((resultSet, rowNumber) -> normalize(new ColumnMapRowMapper().mapRow(resultSet, rowNumber)))
                .optional();
    }

    private List<Map<String, Object>> queryList(String sql, Map<String, ?> parameters) {
        JdbcClient.StatementSpec statement = jdbc.sql(sql);
        for (Map.Entry<String, ?> parameter : parameters.entrySet()) {
            statement = statement.param(parameter.getKey(), parameter.getValue());
        }
        return statement.query((resultSet, rowNumber) -> normalize(new ColumnMapRowMapper().mapRow(resultSet, rowNumber)))
                .list();
    }

    private Map<String, Object> normalize(Map<String, Object> raw) throws SQLException {
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof Array array) {
                Object arrayValue = array.getArray();
                value = arrayValue instanceof Object[] values ? new ArrayList<>(List.of(values)) : List.of();
            } else if (value instanceof Timestamp timestamp) {
                value = timestamp.toInstant();
            } else if (value != null && value.getClass().getName().equals("org.postgresql.util.PGobject")) {
                value = parseDatabaseObject(value.toString());
            }
            normalized.put(entry.getKey(), value);
        }
        return normalized;
    }

    private Object parseDatabaseObject(String value) {
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException exception) {
            return value;
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Value cannot be encoded as JSON", exception);
        }
    }

    private String settingsColumn(String field) {
        return switch (field) {
            case "appearance" -> "\"appearanceSettings\"";
            case "privacy" -> "\"privacySettings\"";
            case "notifications" -> "\"notificationSettings\"";
            default -> throw new IllegalArgumentException("Unsupported settings field");
        };
    }
}
