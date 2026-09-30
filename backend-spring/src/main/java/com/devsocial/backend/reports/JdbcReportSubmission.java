package com.devsocial.backend.reports;

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
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcReportSubmission implements ReportSubmission {
    private final JdbcClient jdbc;

    public JdbcReportSubmission(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> create(UUID reporterId, CreateReportRequest request) {
        PostTarget post = jdbc.sql("SELECT \"authorId\", status::text AS status FROM \"Post\" WHERE id = :id FOR SHARE")
                .param("id", request.postId()).query((rs, row) -> new PostTarget(
                        rs.getObject("authorId", UUID.class), rs.getString("status"))).optional()
                .filter(value -> !"ARCHIVED".equals(value.status()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        if (post.authorId().equals(reporterId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot report your own post");

        boolean duplicate = jdbc.sql("""
                        SELECT EXISTS(SELECT 1 FROM "Report"
                          WHERE "reporterId" = :reporterId AND "reportedPostId" = :postId
                            AND status IN (CAST('PENDING' AS "ReportStatus"), CAST('REVIEWED' AS "ReportStatus")))
                        """).param("reporterId", reporterId).param("postId", request.postId())
                .query(Boolean.class).single();
        if (duplicate) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "You have already reported this post");

        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "Report"
                          (id, "reporterId", "reportedPostId", "reportedUserId", reason, description,
                           status, "reviewedById", "reviewedAt", action, "createdAt", "updatedAt")
                        VALUES (:id, :reporterId, :postId, :reportedUserId, CAST(:reason AS "ReportReason"),
                          :description, CAST('PENDING' AS "ReportStatus"), NULL, NULL, NULL, now(), now())
                        """).param("id", id).param("reporterId", reporterId).param("postId", request.postId())
                .param("reportedUserId", post.authorId()).param("reason", request.reason())
                .param("description", blankToNull(request.description())).update();
        return jdbc.sql("""
                        SELECT id, "reporterId", "reportedPostId", "reportedUserId", reason::text AS reason,
                               description, status::text AS status, "reviewedById", "reviewedAt",
                               action::text AS action, "createdAt", "updatedAt"
                        FROM "Report" WHERE id = :id
                        """).param("id", id).query(this::report).single();
    }

    private Map<String, Object> report(ResultSet rs, int row) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", rs.getObject("id", UUID.class));
        value.put("reporterId", rs.getObject("reporterId", UUID.class));
        value.put("reportedPostId", rs.getObject("reportedPostId", UUID.class));
        value.put("reportedUserId", rs.getObject("reportedUserId", UUID.class));
        value.put("reason", rs.getString("reason"));
        value.put("description", rs.getString("description"));
        value.put("status", rs.getString("status"));
        value.put("reviewedById", rs.getObject("reviewedById", UUID.class));
        value.put("reviewedAt", instant(rs, "reviewedAt"));
        value.put("action", rs.getString("action"));
        value.put("createdAt", instant(rs, "createdAt"));
        value.put("updatedAt", instant(rs, "updatedAt"));
        return value;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record PostTarget(UUID authorId, String status) { }
}
