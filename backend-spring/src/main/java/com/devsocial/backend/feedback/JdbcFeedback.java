package com.devsocial.backend.feedback;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
public class JdbcFeedback implements Feedback {
    private final JdbcClient jdbc;

    public JdbcFeedback(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(UUID actorId, boolean requestAll, int page, int limit,
                                       String search, String status, String type) {
        boolean showAll = requestAll && isStaff(role(actorId));
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parameters = new LinkedHashMap<>();
        if (!showAll) {
            where.append(" AND f.\"userId\" = :actorId");
            parameters.put("actorId", actorId);
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND (f.subject ILIKE :search OR f.description ILIKE :search)");
            parameters.put("search", "%" + search + "%");
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND f.status = CAST(:status AS \"FeedbackStatus\")");
            parameters.put("status", status.toUpperCase(Locale.ROOT));
        }
        if (type != null && !type.isBlank()) {
            where.append(" AND f.type = CAST(:type AS \"FeedbackType\")");
            parameters.put("type", type.toUpperCase(Locale.ROOT));
        }
        List<Map<String, Object>> values = bind(jdbc.sql(projection() + where
                + " ORDER BY f.\"createdAt\" DESC LIMIT :limit OFFSET :offset"), parameters)
                .param("limit", limit).param("offset", (page - 1) * limit).query(this::feedback).list();
        long total = bind(jdbc.sql("SELECT COUNT(*) FROM \"Feedback\" f" + where), parameters)
                .query(Long.class).single();
        return map("feedback", values, "total", total, "page", page,
                "lastPage", (int) Math.ceil((double) total / limit));
    }

    @Override
    @Transactional
    public Map<String, Object> create(UUID actorId, CreateFeedbackRequest request) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "Feedback"
                          (id, "userId", type, subject, description, rating, status, "commentsCount",
                           "solvedById", "solvedAt", "createdAt", "updatedAt")
                        VALUES (:id, :userId, CAST(:type AS "FeedbackType"), :subject, :description, :rating,
                          CAST('OPEN' AS "FeedbackStatus"), 0, NULL, NULL, now(), now())
                        """).param("id", id).param("userId", actorId).param("type", request.type())
                .param("subject", request.subject().trim()).param("description", request.description().trim())
                .param("rating", request.rating()).update();
        return find(id).orElseThrow(this::notFound);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findOne(UUID actorId, UUID feedbackId) {
        Map<String, Object> value = accessible(actorId, feedbackId, "You can only view your own feedback");
        value.put("comments", jdbc.sql(commentProjection() + " WHERE c.\"feedbackId\" = :id ORDER BY c.\"createdAt\" ASC")
                .param("id", feedbackId).query(this::comment).list());
        return value;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> comment(UUID actorId, UUID feedbackId, CreateFeedbackCommentRequest request) {
        accessible(actorId, feedbackId, "You can only comment on your own feedback");
        boolean staff = isStaff(role(actorId));
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "FeedbackComment"
                          (id, "feedbackId", "userId", content, "isAdminComment", "createdAt", "updatedAt")
                        VALUES (:id, :feedbackId, :userId, :content, :staff, now(), now())
                        """).param("id", id).param("feedbackId", feedbackId).param("userId", actorId)
                .param("content", request.content().trim()).param("staff", staff).update();
        jdbc.sql("UPDATE \"Feedback\" SET \"commentsCount\" = \"commentsCount\" + 1, \"updatedAt\" = now() WHERE id = :id")
                .param("id", feedbackId).update();
        return jdbc.sql(commentProjection() + " WHERE c.id = :id").param("id", id)
                .query(this::comment).optional().orElseThrow(this::notFound);
    }

    @Override
    @Transactional
    public Map<String, Object> updateStatus(UUID actorId, UUID feedbackId, String status) {
        if (!isStaff(role(actorId))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only admins or moderators can update feedback status");
        if (find(feedbackId).isEmpty()) throw notFound();
        boolean solved = "SOLVED".equals(status);
        jdbc.sql("""
                        UPDATE "Feedback" SET status = CAST(:status AS "FeedbackStatus"),
                          "solvedById" = :solvedById, "solvedAt" = :solvedAt, "updatedAt" = now()
                        WHERE id = :id
                        """).param("status", status).param("solvedById", solved ? actorId : null)
                .param("solvedAt", solved ? Timestamp.from(Instant.now()) : null).param("id", feedbackId).update();
        return find(feedbackId).orElseThrow(this::notFound);
    }

    private Map<String, Object> accessible(UUID actorId, UUID feedbackId, String message) {
        Map<String, Object> value = find(feedbackId).orElseThrow(this::notFound);
        if (!actorId.equals(value.get("userId")) && !isStaff(role(actorId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        return value;
    }

    private Optional<Map<String, Object>> find(UUID id) {
        return jdbc.sql(projection() + " WHERE f.id = :id").param("id", id).query(this::feedback).optional();
    }

    private String role(UUID userId) {
        return jdbc.sql("SELECT role::text FROM \"User\" WHERE id = :id").param("id", userId)
                .query(String.class).optional().orElse("USER");
    }

    private boolean isStaff(String role) {
        return "ADMIN".equalsIgnoreCase(role) || "MODERATOR".equalsIgnoreCase(role);
    }

    private String projection() {
        return """
                SELECT f.id, f."userId", f.type::text AS type, f.subject, f.description, f.rating,
                       f.status::text AS status, f."commentsCount", f."solvedById", f."solvedAt",
                       f."createdAt", f."updatedAt",
                       owner.id AS owner_id, owner.username AS owner_username,
                       owner."displayName" AS owner_display_name, owner.avatar AS owner_avatar,
                       owner.role::text AS owner_role, owner.level AS owner_level,
                       solver.id AS solver_id, solver.username AS solver_username,
                       solver."displayName" AS solver_display_name, solver.avatar AS solver_avatar,
                       solver.role::text AS solver_role, solver.level AS solver_level
                FROM "Feedback" f
                LEFT JOIN "User" owner ON owner.id = f."userId"
                LEFT JOIN "User" solver ON solver.id = f."solvedById"
                """;
    }

    private String commentProjection() {
        return """
                SELECT c.id, c."feedbackId", c."userId", c.content, c."isAdminComment",
                       c."createdAt", c."updatedAt", u.id AS comment_user_id,
                       u.username AS comment_username, u."displayName" AS comment_display_name,
                       u.avatar AS comment_avatar, u.role::text AS comment_role, u.level AS comment_level
                FROM "FeedbackComment" c LEFT JOIN "User" u ON u.id = c."userId"
                """;
    }

    private Map<String, Object> feedback(ResultSet rs, int row) throws SQLException {
        Integer rating = (Integer) rs.getObject("rating");
        Map<String, Object> value = mapNullable("id", rs.getObject("id", UUID.class),
                "userId", rs.getObject("userId", UUID.class), "type", rs.getString("type"),
                "subject", rs.getString("subject"), "description", rs.getString("description"),
                "rating", rating, "status", rs.getString("status"), "commentsCount", rs.getInt("commentsCount"),
                "solvedById", rs.getObject("solvedById", UUID.class), "solvedAt", instant(rs, "solvedAt"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
        value.put("user", user(rs, "owner"));
        value.put("solvedBy", user(rs, "solver"));
        return value;
    }

    private Map<String, Object> comment(ResultSet rs, int row) throws SQLException {
        Map<String, Object> value = mapNullable("id", rs.getObject("id", UUID.class),
                "feedbackId", rs.getObject("feedbackId", UUID.class), "userId", rs.getObject("userId", UUID.class),
                "content", rs.getString("content"), "isAdminComment", rs.getBoolean("isAdminComment"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
        value.put("user", user(rs, "comment_user"));
        return value;
    }

    private Map<String, Object> user(ResultSet rs, String prefix) throws SQLException {
        UUID id = rs.getObject(prefix + "_id", UUID.class);
        if (id == null) return null;
        return mapNullable("id", id, "username", rs.getString(prefix + "_username"),
                "displayName", rs.getString(prefix + "_display_name"), "avatar", rs.getString(prefix + "_avatar"),
                "role", rs.getString(prefix + "_role"), "level", rs.getInt(prefix + "_level"));
    }

    private JdbcClient.StatementSpec bind(JdbcClient.StatementSpec statement, Map<String, Object> parameters) {
        for (Map.Entry<String, Object> parameter : parameters.entrySet())
            statement = statement.param(parameter.getKey(), parameter.getValue());
        return statement;
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
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
    }
}
