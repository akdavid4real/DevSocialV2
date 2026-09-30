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

    private record Affiliation(String subType, String name) {
    }

    private record SecuritySummary(Instant lastLogin, Instant lastPasswordChange, long totalLogins) {
    }

    private record ExportUser(Map<String, Object> data, Instant createdAt) {
    }

    private record UsageAccount(Map<String, Object> usage, boolean premium) {
    }
}
