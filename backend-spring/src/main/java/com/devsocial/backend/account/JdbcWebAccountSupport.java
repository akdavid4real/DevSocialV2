package com.devsocial.backend.account;

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
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcWebAccountSupport implements WebAccountSupport {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcWebAccountSupport(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> affiliations() {
        Map<String, Object> grouped = new LinkedHashMap<>();
        jdbc.sql("SELECT \"subType\", name FROM \"Affiliation\" ORDER BY name ASC")
                .query((rs, row) -> new Affiliation(rs.getString("subType"), rs.getString("name")))
                .list()
                .forEach(affiliation -> {
                    @SuppressWarnings("unchecked")
                    List<String> names = (List<String>) grouped.computeIfAbsent(
                            affiliation.subType(), ignored -> new ArrayList<String>()
                    );
                    names.add(affiliation.name());
                });
        return grouped;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> securityStats(UUID userId) {
        Instant accountCreated = jdbc.sql("SELECT \"createdAt\" FROM \"User\" WHERE id = :userId")
                .param("userId", userId)
                .query((rs, row) -> rs.getTimestamp("createdAt").toInstant())
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        SecuritySummary summary = jdbc.sql("""
                        SELECT
                            MAX(created_at) FILTER (WHERE event_type = 'LOGIN') AS last_login,
                            MAX(created_at) FILTER (WHERE event_type = 'PASSWORD_CHANGED') AS last_password_change,
                            COUNT(*) FILTER (WHERE event_type = 'LOGIN') AS total_logins
                        FROM public.security_events
                        WHERE user_id = :userId
                        """)
                .param("userId", userId)
                .query((rs, row) -> new SecuritySummary(
                        instant(rs, "last_login"),
                        instant(rs, "last_password_change"),
                        rs.getLong("total_logins")
                ))
                .single();
        List<Map<String, Object>> logins = jdbc.sql("""
                        SELECT created_at, ip_address, user_agent, session_id
                        FROM public.security_events
                        WHERE user_id = :userId AND event_type = 'LOGIN'
                        ORDER BY created_at DESC LIMIT 10
                        """)
                .param("userId", userId)
                .query((rs, row) -> securityEvent(rs, false))
                .list();
        List<Map<String, Object>> events = jdbc.sql("""
                        SELECT event_type, created_at, ip_address, user_agent, session_id
                        FROM public.security_events
                        WHERE user_id = :userId
                        ORDER BY created_at DESC LIMIT 20
                        """)
                .param("userId", userId)
                .query((rs, row) -> securityEvent(rs, true))
                .list();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("accountCreated", accountCreated);
        result.put("lastLogin", summary.lastLogin());
        result.put("lastPasswordChange", summary.lastPasswordChange());
        result.put("totalLogins", summary.totalLogins());
        result.put("recentLogins", logins);
        result.put("recentEvents", events);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> aiUsage(UUID userId) {
        UsageAccount account = jdbc.sql("SELECT \"aiUsage\"::text AS usage, \"isPremium\" FROM \"User\" WHERE id = :userId")
                .param("userId", userId)
                .query((rs, row) -> new UsageAccount(jsonMap(rs.getString("usage")), rs.getBoolean("isPremium")))
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("summaries", featureUsage(account.usage(), "summaries", account.premium() ? 100 : 5));
        usage.put("explanations", featureUsage(account.usage(), "explanations", account.premium() ? 100 : 10));
        usage.put("enhancements", featureUsage(account.usage(), "enhancements", account.premium() ? 100 : 5));
        usage.put("transcriptions", featureUsage(account.usage(), "transcriptions", account.premium() ? 100 : 10));
        usage.put("imageAnalysis", featureUsage(account.usage(), "imageAnalysis", account.premium() ? 100 : 10));
        usage.put("isPremium", account.premium());
        Object resetsOn = account.usage().get("resetsOn");
        usage.put("resetsOn", resetsOn instanceof String ? resetsOn : null);
        return Map.of("data", usage);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(UUID userId, String period) {
        Instant start = dashboardStart(period);
        Map<String, Object> user = jdbc.sql("""
                        SELECT id, username, "displayName", avatar, points, level, badges, "createdAt",
                               "loginStreak", "followersCount", "followingCount"
                        FROM "User" WHERE id = :userId
                        """).param("userId", userId).query((rs, row) -> dashboardUser(rs)).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        long rank = jdbc.sql("SELECT COUNT(*) + 1 FROM \"User\" WHERE points > :points")
                .param("points", number(user.get("points"))).query(Long.class).single();
        user.put("rank", rank);

        PostAggregate periodPosts = postAggregate(userId, start);
        PostAggregate lifetimePosts = postAggregate(userId, null);
        long commentsCount = count("SELECT COUNT(*) FROM \"Comment\" WHERE \"authorId\" = :userId", userId);
        long likesGiven = count("SELECT COUNT(*) FROM \"Like\" WHERE \"userId\" = :userId", userId);
        long likesReceived = count("""
                SELECT COUNT(*) FROM "Like" l JOIN "Post" p ON p.id = l."targetId"
                WHERE p."authorId" = :userId AND l."targetType" = CAST('POST' AS "LikeTargetType")
                """, userId);
        long completedChallenges = count("""
                SELECT COUNT(*) FROM "ChallengeParticipation"
                WHERE "userId" = :userId AND status = CAST('COMPLETED' AS "ProgressStatus")
                """, userId);
        long unreadNotifications = count("""
                SELECT COUNT(*) FROM "Notification" WHERE "recipientId" = :userId AND read = false
                """, userId);

        List<Map<String, Object>> xpBreakdown = jdbc.sql("""
                        SELECT type::text AS type, COALESCE(SUM("xpAmount"), 0) AS total_xp, COUNT(*) AS count
                        FROM "XpLog" WHERE "userId" = :userId AND "createdAt" >= :start
                        GROUP BY type ORDER BY type
                        """).param("userId", userId).param("start", Timestamp.from(start))
                .query((rs, row) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("type", rs.getString("type"));
                    item.put("totalXP", rs.getDouble("total_xp"));
                    item.put("count", rs.getLong("count"));
                    return item;
                }).list();
        List<Map<String, Object>> recentActivities = jdbc.sql("""
                        SELECT to_jsonb(activity_row)::text AS json FROM (
                          SELECT id, "userId", type, description, metadata, "xpEarned", "createdAt"
                          FROM "Activity" WHERE "userId" = :userId ORDER BY "createdAt" DESC LIMIT 8
                        ) activity_row ORDER BY activity_row."createdAt" DESC
                        """).param("userId", userId).query((rs, row) -> jsonMap(rs.getString("json"))).list();
        Map<String, Object> topPost = jdbc.sql("""
                        SELECT id, content, "likesCount", "commentsCount", "viewsCount"
                        FROM "Post" WHERE "authorId" = :userId
                        ORDER BY "likesCount" DESC, "commentsCount" DESC, "viewsCount" DESC, "createdAt" DESC
                        LIMIT 1
                        """).param("userId", userId).query((rs, row) -> {
                    int likes = rs.getInt("likesCount");
                    int comments = rs.getInt("commentsCount");
                    int views = rs.getInt("viewsCount");
                    Map<String, Object> post = new LinkedHashMap<>();
                    post.put("id", rs.getObject("id", UUID.class));
                    post.put("content", rs.getString("content"));
                    post.put("likesCount", likes);
                    post.put("commentsCount", comments);
                    post.put("viewsCount", views);
                    post.put("engagement", likes + comments + views);
                    return post;
                }).optional().orElse(null);
        List<Map<String, Object>> dailyActivity = jdbc.sql("""
                        SELECT activity_date::text AS date, COUNT(*) AS total_activities FROM (
                          SELECT "createdAt"::date AS activity_date FROM "Post"
                            WHERE "authorId" = :userId AND "createdAt" >= :start
                          UNION ALL
                          SELECT "createdAt"::date FROM "Comment"
                            WHERE "authorId" = :userId AND "createdAt" >= :start
                          UNION ALL
                          SELECT "createdAt"::date FROM "Like"
                            WHERE "userId" = :userId AND "createdAt" >= :start
                        ) activity GROUP BY activity_date ORDER BY activity_date
                        """).param("userId", userId).param("start", Timestamp.from(start))
                .query((rs, row) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("date", rs.getString("date"));
                    item.put("totalActivities", rs.getLong("total_activities"));
                    return item;
                }).list();

        Map<String, Object> postStats = new LinkedHashMap<>();
        postStats.put("totalPosts", periodPosts.count());
        postStats.put("totalLikes", periodPosts.likes());
        postStats.put("totalComments", periodPosts.comments());
        postStats.put("totalViews", periodPosts.views());
        postStats.put("avgLikes", average(periodPosts.likes(), periodPosts.count()));
        postStats.put("avgComments", average(periodPosts.comments(), periodPosts.count()));
        postStats.put("lifetimePosts", lifetimePosts.count());
        postStats.put("lifetimeLikes", lifetimePosts.likes());
        postStats.put("lifetimeComments", lifetimePosts.comments());
        postStats.put("lifetimeViews", lifetimePosts.views());
        postStats.put("lifetimeAvgEngagement",
                average(lifetimePosts.likes() + lifetimePosts.comments(), lifetimePosts.count()));

        Map<String, Object> engagement = new LinkedHashMap<>();
        engagement.put("commentsCount", commentsCount);
        engagement.put("likesGiven", likesGiven);
        engagement.put("likesReceived", likesReceived);
        engagement.put("followersCount", number(user.get("followersCount")));
        engagement.put("followingCount", number(user.get("followingCount")));
        engagement.put("topPost", topPost);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("posts", postStats);
        stats.put("engagement", engagement);
        stats.put("xp", Map.of("total", number(user.get("points")), "breakdown", xpBreakdown));
        stats.put("challenges", Map.of("completed", completedChallenges));
        stats.put("notifications", Map.of("unreadCount", unreadNotifications));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", user);
        data.put("stats", stats);
        data.put("charts", Map.of("period", period, "dailyActivity", dailyActivity));
        data.put("recentActivities", recentActivities);
        return Map.of("data", data);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> exportData(UUID userId) {
        ExportUser user = exportUser(userId);
        List<Map<String, Object>> posts = jsonRows("""
                SELECT id, content, "imageUrls", "videoUrls", "isAnonymous", poll,
                       "likesCount", "commentsCount", "viewsCount", status,
                       "createdAt", "updatedAt"
                FROM "Post" WHERE "authorId" = :userId ORDER BY "createdAt" DESC
                """, userId);
        List<Map<String, Object>> comments = jsonRows("""
                SELECT id, "postId", "parentId", content, "imageUrls", "videoUrls",
                       "likesCount", "createdAt", "updatedAt"
                FROM "Comment" WHERE "authorId" = :userId ORDER BY "createdAt" DESC
                """, userId);
        List<Map<String, Object>> projects = jsonRows(
                "SELECT * FROM \"Project\" WHERE \"authorId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );
        List<Map<String, Object>> knowledge = jsonRows(
                "SELECT * FROM \"KnowledgeEntry\" WHERE \"authorId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );
        List<Map<String, Object>> feedback = jsonRows(
                "SELECT * FROM \"Feedback\" WHERE \"userId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );
        List<Map<String, Object>> referrals = jsonRows("""
                SELECT * FROM "Referral"
                WHERE "referrerId" = :userId OR "referredId" = :userId
                ORDER BY "createdAt" DESC
                """, userId);
        List<Map<String, Object>> xpLogs = jsonRows(
                "SELECT * FROM \"XpLog\" WHERE \"userId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );
        List<Map<String, Object>> activities = jsonRows(
                "SELECT * FROM \"Activity\" WHERE \"userId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );
        List<Map<String, Object>> notifications = jsonRows("""
                SELECT id, type, title, message, "relatedId", "relatedType", read,
                       "actionUrl", "createdAt", "updatedAt"
                FROM "Notification" WHERE "recipientId" = :userId ORDER BY "createdAt" DESC
                """, userId);
        List<Map<String, Object>> blockedUsers = jsonRows(
                "SELECT * FROM \"Block\" WHERE \"blockerId\" = :userId ORDER BY \"createdAt\" DESC",
                userId
        );

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportDate", Instant.now());
        export.put("user", user.data());
        export.put("content", Map.of(
                "posts", posts,
                "comments", comments,
                "projects", projects,
                "knowledgeEntries", knowledge,
                "feedback", feedback
        ));
        export.put("accountActivity", Map.of(
                "xpLogs", xpLogs,
                "activities", activities,
                "notifications", notifications,
                "referrals", referrals,
                "blockedUsers", blockedUsers
        ));
        export.put("statistics", Map.of(
                "totalPosts", posts.size(),
                "totalComments", comments.size(),
                "totalProjects", projects.size(),
                "totalKnowledgeEntries", knowledge.size(),
                "totalFeedbackItems", feedback.size(),
                "totalNotifications", notifications.size(),
                "totalFollowers", number(user.data().get("followersCount")),
                "totalFollowing", number(user.data().get("followingCount")),
                "accountAgeDays", Math.max(0, Duration.between(user.createdAt(), Instant.now()).toDays())
        ));
        return Map.of("data", export);
    }

    private ExportUser exportUser(UUID userId) {
        return jdbc.sql("""
                        SELECT to_jsonb(export_user)::text AS json, export_user."createdAt" AS created_at
                        FROM (
                            SELECT id, email, username, "firstName", "lastName", "displayName", bio,
                                   avatar, "bannerUrl", role, affiliation, "techCareerPath", "techStack",
                                   "experienceLevel", "githubUsername", "linkedinUrl", "portfolioUrl",
                                   points, level, badges, "loginStreak", "followersCount", "followingCount",
                                   "isVerified", "onboardingCompleted", location, website, country,
                                   "appearanceSettings", "privacySettings", "notificationSettings", "aiUsage",
                                   "createdAt", "updatedAt"
                            FROM "User" WHERE id = :userId
                        ) export_user
                        """)
                .param("userId", userId)
                .query((rs, row) -> new ExportUser(
                        jsonMap(rs.getString("json")),
                        rs.getTimestamp("created_at").toInstant()
                ))
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private List<Map<String, Object>> jsonRows(String innerSql, UUID userId) {
        return jdbc.sql("SELECT to_jsonb(export_row)::text AS json FROM (" + innerSql
                        + ") export_row ORDER BY export_row.\"createdAt\" DESC")
                .param("userId", userId)
                .query((rs, row) -> jsonMap(rs.getString("json")))
                .list();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonMap(String raw) {
        try {
            Object value = objectMapper.readValue(raw, Object.class);
            return value instanceof Map<?, ?> map
                    ? new LinkedHashMap<>((Map<String, Object>) map)
                    : Map.of();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not read account export data", exception);
        }
    }

    private Map<String, Object> securityEvent(ResultSet rs, boolean includeType) throws SQLException {
        Map<String, Object> event = new LinkedHashMap<>();
        if (includeType) event.put("type", rs.getString("event_type"));
        event.put("createdAt", instant(rs, "created_at"));
        event.put("ipAddress", rs.getString("ip_address"));
        event.put("userAgent", rs.getString("user_agent"));
        event.put("sessionId", rs.getString("session_id"));
        return event;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0;
    }

    private Map<String, Object> featureUsage(Map<String, Object> usage, String key, int fallbackLimit) {
        Object raw = usage.get(key);
        Map<?, ?> feature = raw instanceof Map<?, ?> map ? map : Map.of();
        int used = feature.get("used") instanceof Number number ? number.intValue() : 0;
        int limit = feature.get("limit") instanceof Number number ? number.intValue() : fallbackLimit;
        return Map.of("used", used, "limit", limit, "remaining", Math.max(limit - used, 0));
    }

    private Instant dashboardStart(String period) {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        return switch (period) {
            case "year" -> now.minusYears(1).toInstant();
            case "month" -> now.minusMonths(1).toInstant();
            default -> now.minusDays(7).toInstant();
        };
    }

    private PostAggregate postAggregate(UUID userId, Instant start) {
        String timeFilter = start == null ? "" : " AND \"createdAt\" >= :start";
        JdbcClient.StatementSpec statement = jdbc.sql("""
                        SELECT COUNT(*) AS count, COALESCE(SUM("likesCount"), 0) AS likes,
                               COALESCE(SUM("commentsCount"), 0) AS comments,
                               COALESCE(SUM("viewsCount"), 0) AS views
                        FROM "Post" WHERE "authorId" = :userId
                        """ + timeFilter).param("userId", userId);
        if (start != null) statement = statement.param("start", Timestamp.from(start));
        return statement.query((rs, row) -> new PostAggregate(rs.getLong("count"), rs.getLong("likes"),
                rs.getLong("comments"), rs.getLong("views"))).single();
    }

    private long count(String sql, UUID userId) {
        return jdbc.sql(sql).param("userId", userId).query(Long.class).single();
    }

    private double average(long value, long count) {
        return count == 0 ? 0 : (double) value / count;
    }

    private Map<String, Object> dashboardUser(ResultSet rs) throws SQLException {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", rs.getObject("id", UUID.class));
        user.put("username", rs.getString("username"));
        user.put("displayName", rs.getString("displayName"));
        user.put("avatar", rs.getString("avatar"));
        user.put("points", rs.getInt("points"));
        user.put("level", rs.getInt("level"));
        user.put("badges", List.of((String[]) rs.getArray("badges").getArray()));
        user.put("createdAt", rs.getTimestamp("createdAt").toInstant());
        user.put("loginStreak", rs.getInt("loginStreak"));
        user.put("followersCount", rs.getInt("followersCount"));
        user.put("followingCount", rs.getInt("followingCount"));
        return user;
    }

    private record Affiliation(String subType, String name) {
    }

    private record SecuritySummary(Instant lastLogin, Instant lastPasswordChange, long totalLogins) {
    }

    private record ExportUser(Map<String, Object> data, Instant createdAt) {
    }

    private record UsageAccount(Map<String, Object> usage, boolean premium) {
    }

    private record PostAggregate(long count, long likes, long comments, long views) {
    }
}
