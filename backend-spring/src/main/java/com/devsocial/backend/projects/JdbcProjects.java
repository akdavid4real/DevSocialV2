package com.devsocial.backend.projects;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcProjects implements Projects {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcProjects(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(int page, int limit, String search, String status, String technology) {
        Filter filter = publicFilter(search, status, technology);
        List<Map<String, Object>> projects = queryProjects(filter.sql(), filter.parameters(),
                "p.featured DESC, p.\"createdAt\" DESC", page, limit);
        long total = count(filter.sql(), filter.parameters());
        return page(projects, total, page, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findMine(UUID userId, int page, int limit, String status) {
        StringBuilder where = new StringBuilder(" WHERE p.\"authorId\" = :userId");
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("userId", userId);
        if (status != null && !status.isBlank()) {
            where.append(" AND p.status = CAST(:status AS \"ProjectStatus\")");
            parameters.put("status", status.toUpperCase(Locale.ROOT));
        }
        List<Map<String, Object>> projects = queryProjects(where.toString(), parameters,
                "p.\"updatedAt\" DESC", page, limit);
        long total = count(where.toString(), parameters);
        Map<String, Object> byStatus = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT status::text AS status, COUNT(*) AS count FROM "Project"
                        WHERE "authorId" = :userId GROUP BY status
                        """).param("userId", userId).query((rs, row) -> {
                    byStatus.put(rs.getString("status"), rs.getLong("count"));
                    return 0;
                }).list();
        long totalViews = jdbc.sql("SELECT COALESCE(SUM(views), 0) FROM \"Project\" WHERE \"authorId\" = :userId")
                .param("userId", userId).query(Long.class).single();
        long recordedDailyViews = jdbc.sql("""
                        SELECT COUNT(*) FROM project_views pv
                        JOIN "Project" p ON p.id = pv.project_id WHERE p."authorId" = :userId
                        """).param("userId", userId).query(Long.class).single();
        Map<String, Object> result = page(projects, total, page, limit);
        result.put("stats", map("totalViews", totalViews, "recordedDailyViews", recordedDailyViews,
                "byStatus", byStatus));
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> create(UUID userId, CreateProjectRequest request) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "Project"
                          (id, title, description, "authorId", technologies, "githubUrl", "liveUrl", images,
                           "openPositions", status, visibility, views, featured, "createdAt", "updatedAt")
                        VALUES (:id, :title, :description, :authorId,
                           ARRAY(SELECT jsonb_array_elements_text(CAST(:technologies AS jsonb))),
                           :githubUrl, :liveUrl,
                           ARRAY(SELECT jsonb_array_elements_text(CAST(:images AS jsonb))),
                           CAST(:openPositions AS jsonb), CAST(:status AS "ProjectStatus"),
                           CAST(:visibility AS "Visibility"), 0, false, now(), now())
                        """).param("id", id).param("title", request.title().trim())
                .param("description", request.description().trim()).param("authorId", userId)
                .param("technologies", json(request.technologies() == null ? List.of() : request.technologies()))
                .param("githubUrl", blankToNull(request.githubUrl())).param("liveUrl", blankToNull(request.liveUrl()))
                .param("images", json(request.images() == null ? List.of() : request.images()))
                .param("openPositions", json(request.openPositions() == null ? List.of() : request.openPositions()))
                .param("status", request.status() == null ? "IN_PROGRESS" : request.status())
                .param("visibility", request.visibility() == null ? "PUBLIC" : request.visibility()).update();
        return project(id).orElseThrow(() -> notFound("Project not found"));
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> findOne(UUID projectId, Optional<UUID> viewerId, String visitorKey) {
        Map<String, Object> project = project(projectId)
                .filter(value -> "PUBLIC".equals(value.get("visibility")))
                .orElseThrow(() -> notFound("Project not found"));
        int inserted = jdbc.sql("""
                        INSERT INTO project_views (project_id, viewer_id, visitor_key, viewed_on)
                        VALUES (:projectId, :viewerId, :visitorKey, CURRENT_DATE)
                        ON CONFLICT (project_id, visitor_key, viewed_on) DO NOTHING
                        """).param("projectId", projectId).param("viewerId", viewerId.orElse(null))
                .param("visitorKey", visitorKey).update();
        if (inserted > 0) {
            jdbc.sql("UPDATE \"Project\" SET views = views + 1, \"updatedAt\" = now() WHERE id = :id")
                    .param("id", projectId).update();
            project.put("views", ((Number) project.get("views")).intValue() + 1);
        }
        return project;
    }

    @Override
    @Transactional
    public Map<String, Object> updateStatus(UUID userId, UUID projectId, String status) {
        assertOwner(userId, projectId, "Only the project owner can update status");
        jdbc.sql("""
                        UPDATE "Project" SET status = CAST(:status AS "ProjectStatus"), "updatedAt" = now()
                        WHERE id = :id
                        """).param("status", status).param("id", projectId).update();
        return project(projectId).orElseThrow(() -> notFound("Project not found"));
    }

    @Override
    @Transactional
    public Map<String, Object> remove(UUID userId, UUID projectId) {
        assertOwner(userId, projectId, "Only the project owner can delete this project");
        jdbc.sql("DELETE FROM \"Project\" WHERE id = :id").param("id", projectId).update();
        return map("success", true, "message", "Project deleted successfully");
    }

    private Filter publicFilter(String search, String status, String technology) {
        StringBuilder where = new StringBuilder(" WHERE p.visibility = CAST('PUBLIC' AS \"Visibility\")");
        Map<String, Object> parameters = new LinkedHashMap<>();
        if (search != null && !search.isBlank()) {
            where.append(" AND (p.title ILIKE :search OR p.description ILIKE :search)");
            parameters.put("search", "%" + search + "%");
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND p.status = CAST(:status AS \"ProjectStatus\")");
            parameters.put("status", status.toUpperCase(Locale.ROOT));
        }
        if (technology != null && !technology.isBlank()) {
            where.append(" AND :technology = ANY(p.technologies)");
            parameters.put("technology", technology);
        }
        return new Filter(where.toString(), parameters);
    }

    private List<Map<String, Object>> queryProjects(String where, Map<String, Object> parameters,
                                                    String order, int page, int limit) {
        JdbcClient.StatementSpec statement = jdbc.sql(projectProjection() + where + " ORDER BY " + order
                + " LIMIT :limit OFFSET :offset");
        statement = bind(statement, parameters).param("limit", limit).param("offset", (page - 1) * limit);
        return statement.query(this::projectMap).list();
    }

    private long count(String where, Map<String, Object> parameters) {
        JdbcClient.StatementSpec statement = bind(jdbc.sql("SELECT COUNT(*) FROM \"Project\" p" + where), parameters);
        return statement.query(Long.class).single();
    }

    private Optional<Map<String, Object>> project(UUID id) {
        return jdbc.sql(projectProjection() + " WHERE p.id = :id").param("id", id)
                .query(this::projectMap).optional();
    }

    private String projectProjection() {
        return """
                SELECT p.id, p.title, p.description, p."authorId", p.technologies, p."githubUrl", p."liveUrl",
                       p.images, p."openPositions"::text AS open_positions, p.status::text AS status,
                       p.visibility::text AS visibility, p.views, p.featured, p."createdAt", p."updatedAt",
                       u.id AS user_id, u.username, u."displayName", u.avatar, u.level
                FROM "Project" p JOIN "User" u ON u.id = p."authorId"
                """;
    }

    private Map<String, Object> projectMap(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = mapNullable(
                "id", rs.getObject("id", UUID.class), "title", rs.getString("title"),
                "description", rs.getString("description"), "authorId", rs.getObject("authorId", UUID.class),
                "technologies", array(rs, "technologies"), "githubUrl", rs.getString("githubUrl"),
                "liveUrl", rs.getString("liveUrl"), "images", array(rs, "images"),
                "openPositions", parseJson(rs.getString("open_positions")), "status", rs.getString("status"),
                "visibility", rs.getString("visibility"), "views", rs.getInt("views"),
                "featured", rs.getBoolean("featured"), "createdAt", instant(rs, "createdAt"),
                "updatedAt", instant(rs, "updatedAt"));
        result.put("author", mapNullable("id", rs.getObject("user_id", UUID.class),
                "username", rs.getString("username"), "displayName", rs.getString("displayName"),
                "avatar", rs.getString("avatar"), "level", rs.getInt("level")));
        return result;
    }

    private void assertOwner(UUID userId, UUID projectId, String message) {
        UUID owner = jdbc.sql("SELECT \"authorId\" FROM \"Project\" WHERE id = :id")
                .param("id", projectId).query(UUID.class).optional()
                .orElseThrow(() -> notFound("Project not found"));
        if (!owner.equals(userId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    private JdbcClient.StatementSpec bind(JdbcClient.StatementSpec statement, Map<String, Object> parameters) {
        for (Map.Entry<String, Object> parameter : parameters.entrySet())
            statement = statement.param(parameter.getKey(), parameter.getValue());
        return statement;
    }

    private Map<String, Object> page(List<Map<String, Object>> projects, long total, int page, int limit) {
        return map("projects", projects, "total", total, "page", page,
                "lastPage", (int) Math.ceil((double) total / limit));
    }

    private List<String> array(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        return value == null ? List.of() : List.of((String[]) value.getArray());
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Project data is not valid JSON", exception);
        }
    }

    private Object parseJson(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, new TypeReference<Object>() { });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored project data is not valid JSON", exception);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Map<String, Object> map(Object... values) {
        return mapNullable(values);
    }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private record Filter(String sql, Map<String, Object> parameters) { }
}
