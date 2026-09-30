package com.devsocial.backend.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcAdminReports implements AdminReports {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final AdminRolePolicy roles;

    public JdbcAdminReports(JdbcClient jdbc, ObjectMapper objectMapper, AdminRolePolicy roles) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.roles = roles;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(UUID actorId, String status, int page, int limit) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        String filter = status == null ? "" : " WHERE r.status = CAST(:status AS \"ReportStatus\")";
        JdbcClient.StatementSpec list = jdbc.sql(listProjection() + filter
                + " ORDER BY r.\"createdAt\" DESC LIMIT :limit OFFSET :offset");
        JdbcClient.StatementSpec count = jdbc.sql("SELECT COUNT(*) FROM \"Report\" r" + filter);
        if (status != null) {
            list = list.param("status", status);
            count = count.param("status", status);
        }
        List<Map<String, Object>> values = list.param("limit", limit).param("offset", (page - 1) * limit)
                .query(this::listReport).list();
        long total = count.query(Long.class).single();
        return map("data", values, "meta", map("total", total, "page", page, "limit", limit,
                "totalPages", (int) Math.ceil((double) total / limit)));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findOne(UUID actorId, UUID reportId) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        return jdbc.sql(detailProjection() + " WHERE r.id = :id").param("id", reportId)
                .query(this::detailReport).optional().orElseThrow(this::notFound);
    }

    @Override
    @Transactional
    public Map<String, Object> resolve(UUID actorId, UUID reportId, ResolveAdminReportRequest request) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_MODERATOR);
        ReportTarget target = jdbc.sql("""
                        SELECT "reportedPostId", "reportedUserId" FROM "Report" WHERE id = :id FOR UPDATE
                        """).param("id", reportId).query((rs, row) -> new ReportTarget(
                        rs.getObject("reportedPostId", UUID.class), rs.getObject("reportedUserId", UUID.class)))
                .optional().orElseThrow(this::notFound);

        String actionUpdate = request.action() == null ? "" : ", action = CAST(:action AS \"ReportAction\")";
        JdbcClient.StatementSpec update = jdbc.sql("""
                UPDATE "Report" SET status = CAST(:status AS "ReportStatus"), "reviewedById" = :actorId,
                  "reviewedAt" = now(), "updatedAt" = now()
                """ + actionUpdate + " WHERE id = :id RETURNING " + reportReturningProjection())
                .param("status", request.status()).param("actorId", actorId).param("id", reportId);
        if (request.action() != null) update = update.param("action", request.action());
        Map<String, Object> resolved = update.query(this::report).single();

        if ("POST_REMOVED".equals(request.action()))
            jdbc.sql("UPDATE \"Post\" SET status = CAST('BLOCKED' AS \"PostStatus\"), \"updatedAt\" = now() "
                    + "WHERE id = :id").param("id", target.postId()).update();
        if ("USER_BANNED".equals(request.action()) || "USER_SUSPENDED".equals(request.action()))
            jdbc.sql("UPDATE \"User\" SET \"isBlocked\" = true, \"updatedAt\" = now() WHERE id = :id")
                    .param("id", target.userId()).update();

        Map<String, Object> metadata = mapNullable("action", request.action(), "status", request.status());
        jdbc.sql("""
                        INSERT INTO "AuditLog" (id, "adminId", action, "targetType", "targetId", reason,
                          metadata, "createdAt")
                        VALUES (:id, :actorId, 'REPORT_RESOLVED', 'REPORT', :reportId, :reason,
                          CAST(:metadata AS jsonb), now())
                        """).param("id", UUID.randomUUID()).param("actorId", actorId)
                .param("reportId", reportId).param("reason", request.reviewNote(), Types.VARCHAR)
                .param("metadata", json(metadata)).update();
        return resolved;
    }

    private String listProjection() {
        return reportProjection() + """
                , reporter.id AS reporter_id, reporter.username AS reporter_username,
                  reporter."displayName" AS reporter_display_name, reporter.avatar AS reporter_avatar,
                  reporter.level AS reporter_level,
                  reported.id AS reported_id, reported.username AS reported_username,
                  reported."displayName" AS reported_display_name, reported.avatar AS reported_avatar,
                  reported.level AS reported_level, reported."isBlocked" AS reported_is_blocked,
                  post.id AS post_id, post.content AS post_content, post.status::text AS post_status,
                  post."createdAt" AS post_created_at, author.id AS author_id,
                  author.username AS author_username, author."displayName" AS author_display_name,
                  author.avatar AS author_avatar
                FROM "Report" r
                LEFT JOIN "User" reporter ON reporter.id = r."reporterId"
                LEFT JOIN "User" reported ON reported.id = r."reportedUserId"
                LEFT JOIN "Post" post ON post.id = r."reportedPostId"
                LEFT JOIN "User" author ON author.id = post."authorId"
                """;
    }

    private String detailProjection() {
        return reportProjection() + """
                , reported.id AS reported_id, reported.username AS reported_username,
                  reported.email AS reported_email, reported.role::text AS reported_role,
                  reported."isBlocked" AS reported_is_blocked,
                  post.id AS post_id, post.content AS post_content, post.status::text AS post_status,
                  post."createdAt" AS post_created_at, author.username AS author_username,
                  reporter.id AS reporter_id, reporter.username AS reporter_username
                FROM "Report" r
                LEFT JOIN "User" reported ON reported.id = r."reportedUserId"
                LEFT JOIN "Post" post ON post.id = r."reportedPostId"
                LEFT JOIN "User" author ON author.id = post."authorId"
                LEFT JOIN "User" reporter ON reporter.id = r."reporterId"
                """;
    }

    private String reportProjection() {
        return "SELECT " + reportColumns("r");
    }

    private String reportReturningProjection() {
        return reportColumns("");
    }

    private String reportColumns(String alias) {
        String prefix = alias.isEmpty() ? "" : alias + ".";
        return prefix + "id, " + prefix + "\"reporterId\", " + prefix + "\"reportedPostId\", "
                + prefix + "\"reportedUserId\", " + prefix + "reason::text AS reason, "
                + prefix + "description, " + prefix + "status::text AS status, "
                + prefix + "\"reviewedById\", " + prefix + "\"reviewedAt\", "
                + prefix + "action::text AS action, " + prefix + "\"createdAt\", " + prefix + "\"updatedAt\"";
    }

    private Map<String, Object> listReport(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = report(rs, row);
        result.put("reporter", user(rs, "reporter", true, false));
        result.put("reportedUser", user(rs, "reported", true, true));
        result.put("reportedPost", post(rs, true));
        return result;
    }

    private Map<String, Object> detailReport(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = report(rs, row);
        UUID reportedId = rs.getObject("reported_id", UUID.class);
        result.put("reportedUser", reportedId == null ? null : mapNullable("id", reportedId,
                "username", rs.getString("reported_username"), "email", rs.getString("reported_email"),
                "role", rs.getString("reported_role"), "isBlocked", rs.getBoolean("reported_is_blocked")));
        result.put("reportedPost", post(rs, false));
        UUID reporterId = rs.getObject("reporter_id", UUID.class);
        result.put("reporter", reporterId == null ? null : mapNullable("id", reporterId,
                "username", rs.getString("reporter_username")));
        return result;
    }

    private Map<String, Object> report(ResultSet rs, int row) throws SQLException {
        return mapNullable("id", rs.getObject("id", UUID.class),
                "reporterId", rs.getObject("reporterId", UUID.class),
                "reportedPostId", rs.getObject("reportedPostId", UUID.class),
                "reportedUserId", rs.getObject("reportedUserId", UUID.class),
                "reason", rs.getString("reason"), "description", rs.getString("description"),
                "status", rs.getString("status"), "reviewedById", rs.getObject("reviewedById", UUID.class),
                "reviewedAt", instant(rs, "reviewedAt"), "action", rs.getString("action"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
    }

    private Map<String, Object> user(ResultSet rs, String prefix, boolean level, boolean blocked)
            throws SQLException {
        UUID id = rs.getObject(prefix + "_id", UUID.class);
        if (id == null) return null;
        Map<String, Object> result = mapNullable("id", id, "username", rs.getString(prefix + "_username"),
                "displayName", rs.getString(prefix + "_display_name"),
                "avatar", rs.getString(prefix + "_avatar"));
        if (level) result.put("level", rs.getInt(prefix + "_level"));
        if (blocked) result.put("isBlocked", rs.getBoolean(prefix + "_is_blocked"));
        return result;
    }

    private Map<String, Object> post(ResultSet rs, boolean fullAuthor) throws SQLException {
        UUID id = rs.getObject("post_id", UUID.class);
        if (id == null) return null;
        Map<String, Object> author = fullAuthor
                ? mapNullable("id", rs.getObject("author_id", UUID.class),
                        "username", rs.getString("author_username"),
                        "displayName", rs.getString("author_display_name"),
                        "avatar", rs.getString("author_avatar"))
                : mapNullable("username", rs.getString("author_username"));
        return mapNullable("id", id, "content", rs.getString("post_content"),
                "status", rs.getString("post_status"), "createdAt", instant(rs, "post_created_at"),
                "author", author);
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Audit metadata is not valid JSON", exception);
        }
    }

    private Map<String, Object> map(Object... values) { return mapNullable(values); }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
    }

    private record ReportTarget(UUID postId, UUID userId) { }
}
