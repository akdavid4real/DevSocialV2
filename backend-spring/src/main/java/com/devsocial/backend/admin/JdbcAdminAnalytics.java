package com.devsocial.backend.admin;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcAdminAnalytics implements AdminAnalytics {
    private final JdbcClient jdbc;
    private final AdminRolePolicy roles;

    public JdbcAdminAnalytics(JdbcClient jdbc, AdminRolePolicy roles) {
        this.jdbc = jdbc;
        this.roles = roles;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(UUID actorId) {
        roles.require(actorId, AdminRolePolicy.STAFF_OR_ANALYTICS);
        Instant now = Instant.now();
        Timestamp today = Timestamp.from(LocalDate.now(ZoneId.systemDefault())
                .atStartOfDay(ZoneId.systemDefault()).toInstant());
        DashboardCounts counts = jdbc.sql("""
                        SELECT
                          (SELECT COUNT(*) FROM "User") AS total_users,
                          (SELECT COUNT(*) FROM "User" WHERE "lastActive" >= :weekAgo) AS active_users,
                          (SELECT COUNT(*) FROM "User" WHERE "isBlocked" = true) AS blocked_users,
                          (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= :today) AS new_users_today,
                          (SELECT COUNT(*) FROM "Post") AS total_posts,
                          (SELECT COUNT(*) FROM "Post" WHERE "createdAt" >= :today) AS posts_today,
                          (SELECT COUNT(*) FROM "Comment") AS total_comments,
                          (SELECT COUNT(*) FROM "Report" WHERE status = CAST('PENDING' AS "ReportStatus"))
                            AS pending_reports
                        """).param("weekAgo", Timestamp.from(now.minus(7, ChronoUnit.DAYS)))
                .param("today", today).query((rs, row) -> new DashboardCounts(
                        rs.getLong("total_users"), rs.getLong("active_users"), rs.getLong("blocked_users"),
                        rs.getLong("new_users_today"), rs.getLong("total_posts"), rs.getLong("posts_today"),
                        rs.getLong("total_comments"), rs.getLong("pending_reports"))).single();
        return map("users", map("total", counts.totalUsers(), "active", counts.activeUsers(),
                        "blocked", counts.blockedUsers(), "newToday", counts.newUsersToday()),
                "content", map("totalPosts", counts.totalPosts(), "totalComments", counts.totalComments(),
                        "postsToday", counts.postsToday()),
                "moderation", map("pendingReports", counts.pendingReports()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> userGrowth(UUID actorId, int days) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_ANALYTICS);
        Timestamp start = Timestamp.from(Instant.now().minus(days, ChronoUnit.DAYS));
        return jdbc.sql("""
                        SELECT "createdAt", COUNT(*) AS count FROM "User"
                        WHERE "createdAt" >= :start GROUP BY "createdAt" ORDER BY "createdAt" ASC
                        """).param("start", start).query((rs, row) -> map(
                        "createdAt", instant(rs, "createdAt"), "_count", map("_all", rs.getLong("count"))))
                .list();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> aiLogs(UUID actorId, int page, int limit, String service, String taskType) {
        roles.require(actorId, AdminRolePolicy.ADMIN_OR_ANALYTICS);
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parameters = new LinkedHashMap<>();
        if (service != null && !service.isBlank()) {
            where.append(" AND a.service = CAST(:service AS \"AiService\")");
            parameters.put("service", service);
        }
        if (taskType != null && !taskType.isBlank()) {
            where.append(" AND a.\"taskType\" = :taskType");
            parameters.put("taskType", taskType);
        }
        List<Map<String, Object>> logs = bind(jdbc.sql("""
                        SELECT a.id, a.service::text AS service, a."aiModel", a."taskType", a."inputLength",
                          a."outputSummary", a."userId", a.success, a."errorMessage", a."executionTime",
                          a."createdAt", u.id AS u_id, u.username, u."displayName", u.avatar
                        FROM "AiLog" a LEFT JOIN "User" u ON u.id = a."userId"
                        """ + where + " ORDER BY a.\"createdAt\" DESC LIMIT :limit OFFSET :offset"), parameters)
                .param("limit", limit).param("offset", (page - 1) * limit).query(this::aiLog).list();
        long total = bind(jdbc.sql("SELECT COUNT(*) FROM \"AiLog\" a" + where), parameters)
                .query(Long.class).single();
        List<Map<String, Object>> stats = bind(jdbc.sql("""
                        SELECT a.service::text AS service, a."taskType", COUNT(*) AS count,
                          ROUND(COALESCE(AVG(a."executionTime"), 0)) AS average
                        FROM "AiLog" a
                        """ + where + " GROUP BY a.service, a.\"taskType\""), parameters)
                .query((rs, row) -> map("service", rs.getString("service"),
                        "taskType", rs.getString("taskType"), "count", rs.getLong("count"),
                        "avgExecutionTime", rs.getInt("average"))).list();
        return map("data", logs, "meta", map("total", total, "page", page, "limit", limit,
                        "totalPages", (int) Math.ceil((double) total / limit)), "stats", stats);
    }

    private Map<String, Object> aiLog(ResultSet rs, int row) throws SQLException {
        Map<String, Object> result = mapNullable("id", rs.getObject("id", UUID.class),
                "service", rs.getString("service"), "aiModel", rs.getString("aiModel"),
                "taskType", rs.getString("taskType"), "inputLength", rs.getInt("inputLength"),
                "outputSummary", rs.getString("outputSummary"), "userId", rs.getObject("userId", UUID.class),
                "success", rs.getBoolean("success"), "errorMessage", rs.getString("errorMessage"),
                "executionTime", rs.getInt("executionTime"), "createdAt", instant(rs, "createdAt"));
        UUID userId = rs.getObject("u_id", UUID.class);
        result.put("user", userId == null ? null : mapNullable("id", userId,
                "username", rs.getString("username"), "displayName", rs.getString("displayName"),
                "avatar", rs.getString("avatar")));
        return result;
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

    private record DashboardCounts(long totalUsers, long activeUsers, long blockedUsers, long newUsersToday,
                                   long totalPosts, long postsToday, long totalComments, long pendingReports) { }
}
