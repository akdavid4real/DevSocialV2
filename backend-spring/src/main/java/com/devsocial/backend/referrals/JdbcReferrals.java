package com.devsocial.backend.referrals;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
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
public class JdbcReferrals implements Referrals {
    private static final char[] CODE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();

    private final JdbcClient jdbc;
    private final SecureRandom random = new SecureRandom();

    public JdbcReferrals(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> getOrCreateCode(UUID userId) {
        UserCode user = jdbc.sql("SELECT username, \"referralCode\" FROM \"User\" WHERE id = :id FOR UPDATE")
                .param("id", userId).query((rs, row) -> new UserCode(rs.getString("username"),
                        rs.getString("referralCode"))).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.referralCode() != null && !user.referralCode().isBlank())
            return Map.of("referralCode", user.referralCode());

        String code = uniqueCode(user.username());
        jdbc.sql("UPDATE \"User\" SET \"referralCode\" = :code, \"updatedAt\" = now() WHERE id = :id")
                .param("code", code).param("id", userId).update();
        return Map.of("referralCode", code);
    }

    @Override
    @Transactional
    public Map<String, Object> stats(UUID userId) {
        expireOld();
        Map<String, Object> pending = stat();
        Map<String, Object> completed = stat();
        Map<String, Object> expired = stat();
        Map<String, Object> total = stat();
        jdbc.sql("""
                        SELECT status::text AS status, COUNT(*) AS count,
                               COALESCE(SUM("referrerReward"), 0) AS rewards
                        FROM "Referral" WHERE "referrerId" = :userId GROUP BY status
                        """).param("userId", userId).query((rs, row) -> {
                    Map<String, Object> destination = switch (rs.getString("status")) {
                        case "PENDING" -> pending;
                        case "COMPLETED" -> completed;
                        default -> expired;
                    };
                    long count = rs.getLong("count");
                    long rewards = rs.getLong("rewards");
                    destination.put("count", count);
                    destination.put("rewards", rewards);
                    total.put("count", ((Number) total.get("count")).longValue() + count);
                    total.put("rewards", ((Number) total.get("rewards")).longValue() + rewards);
                    return 0;
                }).list();

        List<Map<String, Object>> recent = jdbc.sql("""
                        SELECT r.id, r."referrerId", r."referredId", r."referralCode", r.status::text AS status,
                               r."expiresAt", r."completedAt", r."rewardsClaimed", r."referrerReward",
                               r."referredReward", r."createdAt", r."updatedAt",
                               u.id AS user_id, u.username, u."displayName", u.avatar, u.level
                        FROM "Referral" r LEFT JOIN "User" u ON u.id = r."referredId"
                        WHERE r."referrerId" = :userId ORDER BY r."createdAt" DESC LIMIT 10
                        """).param("userId", userId).query(this::referral).list();

        return map("stats", map("pending", pending, "completed", completed, "expired", expired, "total", total),
                "recentReferrals", recent);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> validate(String referralCode) {
        Optional<Map<String, Object>> referrer = jdbc.sql("""
                        SELECT id, username, "displayName", avatar, level FROM "User"
                        WHERE "referralCode" = :code
                        """).param("code", referralCode.trim()).query((rs, row) -> user(rs)).optional();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("valid", referrer.isPresent());
        result.put("referrer", referrer.orElse(null));
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> expireOld() {
        int count = jdbc.sql("""
                        UPDATE "Referral" SET status = CAST('EXPIRED' AS "ReferralStatus"), "updatedAt" = now()
                        WHERE status = CAST('PENDING' AS "ReferralStatus") AND "expiresAt" < now()
                        """).update();
        return Map.of("count", count);
    }

    private String uniqueCode(String username) {
        String base = username.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        base = base.isBlank() ? "dev" : base;
        base = base.substring(0, Math.min(base.length(), 16));
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = base + suffix();
            boolean exists = jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"User\" WHERE \"referralCode\" = :code)")
                    .param("code", candidate).query(Boolean.class).single();
            if (!exists) return candidate;
        }
        return base + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    }

    private String suffix() {
        StringBuilder value = new StringBuilder(6);
        for (int index = 0; index < 6; index++) value.append(CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)]);
        return value.toString();
    }

    private Map<String, Object> referral(ResultSet rs, int row) throws SQLException {
        Map<String, Object> value = mapNullable("id", rs.getObject("id", UUID.class),
                "referrerId", rs.getObject("referrerId", UUID.class),
                "referredId", rs.getObject("referredId", UUID.class), "referralCode", rs.getString("referralCode"),
                "status", rs.getString("status"), "expiresAt", instant(rs, "expiresAt"),
                "completedAt", instant(rs, "completedAt"), "rewardsClaimed", rs.getBoolean("rewardsClaimed"),
                "referrerReward", rs.getInt("referrerReward"), "referredReward", rs.getInt("referredReward"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
        value.put("referred", rs.getObject("user_id", UUID.class) == null ? null : user(rs));
        return value;
    }

    private Map<String, Object> user(ResultSet rs) throws SQLException {
        String idColumn;
        try { rs.findColumn("user_id"); idColumn = "user_id"; } catch (SQLException exception) { idColumn = "id"; }
        return mapNullable("id", rs.getObject(idColumn, UUID.class), "username", rs.getString("username"),
                "displayName", rs.getString("displayName"), "avatar", rs.getString("avatar"),
                "level", rs.getInt("level"));
    }

    private Map<String, Object> stat() {
        return map("count", 0L, "rewards", 0L);
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

    private record UserCode(String username, String referralCode) { }
}
