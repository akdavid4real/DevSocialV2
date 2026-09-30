package com.devsocial.backend.knowledge;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcKnowledgeBank implements KnowledgeBank {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcKnowledgeBank(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(int page, int limit, String technology, String category, String search) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parameters = new LinkedHashMap<>();
        if (technology != null && !technology.isBlank() && !"All".equals(technology)) {
            where.append(" AND k.technology ILIKE :technology");
            parameters.put("technology", technology);
        }
        if (category != null && !category.isBlank()) {
            where.append(" AND k.category = CAST(:category AS \"KnowledgeCategory\")");
            parameters.put("category", category.toUpperCase(Locale.ROOT));
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND (k.title ILIKE :searchLike OR k.content ILIKE :searchLike OR :search = ANY(k.tags))");
            parameters.put("searchLike", "%" + search + "%");
            parameters.put("search", search);
        }
        JdbcClient.StatementSpec query = bind(jdbc.sql(projection() + where
                + " ORDER BY k.\"likesCount\" DESC, k.\"createdAt\" DESC LIMIT :limit OFFSET :offset"), parameters)
                .param("limit", limit).param("offset", (page - 1) * limit);
        List<Map<String, Object>> entries = query.query(this::entry).list();
        long total = bind(jdbc.sql("SELECT COUNT(*) FROM \"KnowledgeEntry\" k" + where), parameters)
                .query(Long.class).single();
        return map("entries", entries, "total", total, "page", page,
                "lastPage", (int) Math.ceil((double) total / limit));
    }

    @Override
    @Transactional
    public Map<String, Object> create(UUID userId, CreateKnowledgeEntryRequest request) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "KnowledgeEntry"
                          (id, title, technology, category, content, "codeExample", tags, "authorId",
                           "likesCount", "createdAt", "updatedAt")
                        VALUES (:id, :title, :technology, CAST(:category AS "KnowledgeCategory"), :content,
                          :codeExample, ARRAY(SELECT jsonb_array_elements_text(CAST(:tags AS jsonb))),
                          :authorId, 0, now(), now())
                        """).param("id", id).param("title", request.title().trim())
                .param("technology", request.technology().trim()).param("category", request.category())
                .param("content", request.content().trim()).param("codeExample", blankToNull(request.codeExample()))
                .param("tags", json(request.tags() == null ? List.of() : request.tags()))
                .param("authorId", userId).update();
        return find(id).orElseThrow(() -> notFound());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findOne(UUID entryId) {
        return find(entryId).orElseThrow(this::notFound);
    }

    private Optional<Map<String, Object>> find(UUID id) {
        return jdbc.sql(projection() + " WHERE k.id = :id").param("id", id).query(this::entry).optional();
    }

    private String projection() {
        return """
                SELECT k.id, k.title, k.technology, k.category::text AS category, k.content,
                       k."codeExample", k.tags, k."authorId", k."likesCount", k."createdAt", k."updatedAt",
                       u.id AS user_id, u.username, u."displayName", u.avatar, u.level
                FROM "KnowledgeEntry" k LEFT JOIN "User" u ON u.id = k."authorId"
                """;
    }

    private Map<String, Object> entry(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = mapNullable("id", rs.getObject("id", UUID.class),
                "title", rs.getString("title"), "technology", rs.getString("technology"),
                "category", rs.getString("category"), "content", rs.getString("content"),
                "codeExample", rs.getString("codeExample"), "tags", array(rs, "tags"),
                "authorId", rs.getObject("authorId", UUID.class), "likesCount", rs.getInt("likesCount"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
        UUID authorId = rs.getObject("user_id", UUID.class);
        result.put("author", authorId == null ? null : mapNullable("id", authorId,
                "username", rs.getString("username"), "displayName", rs.getString("displayName"),
                "avatar", rs.getString("avatar"), "level", rs.getInt("level")));
        return result;
    }

    private JdbcClient.StatementSpec bind(JdbcClient.StatementSpec statement, Map<String, Object> parameters) {
        for (Map.Entry<String, Object> parameter : parameters.entrySet())
            statement = statement.param(parameter.getKey(), parameter.getValue());
        return statement;
    }

    private List<String> array(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        return value == null ? List.of() : List.of((String[]) value.getArray());
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Knowledge entry tags are not valid JSON", exception);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Map<String, Object> map(Object... values) { return mapNullable(values); }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge entry not found");
    }
}
