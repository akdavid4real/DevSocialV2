package com.devsocial.backend.auth;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcRegistrationRepository implements RegistrationRepository {
    private final JdbcClient jdbc;
    private final SessionUserRepository users;

    public JdbcRegistrationRepository(JdbcClient jdbc, SessionUserRepository users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @Override
    public Optional<UUID> findReferrer(String referralCode) {
        return jdbc.sql("SELECT id FROM \"User\" WHERE \"referralCode\" = :code LIMIT 1")
                .param("code", referralCode.trim())
                .query(UUID.class)
                .optional();
    }

    @Override
    @Transactional
    public Map<String, Object> createUser(RegistrationProfile profile) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("supabaseUserId", profile.supabaseUserId().toString())
                .addValue("email", profile.email())
                .addValue("username", profile.username())
                .addValue("firstName", profile.firstName())
                .addValue("lastName", profile.lastName())
                .addValue("displayName", profile.displayName())
                .addValue("birthMonth", profile.birthMonth(), Types.INTEGER)
                .addValue("birthDay", profile.birthDay(), Types.INTEGER)
                .addValue("affiliation", profile.affiliation());

        UUID userId = jdbc.sql("""
                        INSERT INTO "User" (
                            "supabaseAuthId", email, username, "firstName", "lastName",
                            "displayName", "birthMonth", "birthDay", affiliation
                        ) VALUES (
                            :supabaseUserId, :email, :username, :firstName, :lastName,
                            :displayName, :birthMonth, :birthDay, :affiliation
                        )
                        RETURNING id
                        """)
                .paramSource(parameters)
                .query(UUID.class)
                .single();

        jdbc.sql("INSERT INTO \"UserStats\" (\"userId\") VALUES (:userId)")
                .param("userId", userId)
                .update();

        return users.findBySupabaseUserId(profile.supabaseUserId())
                .orElseThrow(() -> new IllegalStateException("Created user profile could not be loaded"))
                .profile();
    }

    @Override
    @Transactional
    public void completeReferral(String referralCode, UUID referrerId, UUID referredId) {
        Boolean exists = jdbc.sql("SELECT EXISTS (SELECT 1 FROM \"Referral\" WHERE \"referredId\" = :referredId)")
                .param("referredId", referredId)
                .query(Boolean.class)
                .single();
        if (Boolean.TRUE.equals(exists) || referrerId.equals(referredId)) {
            return;
        }

        String uniqueCode = referralCode.trim() + "-" + referredId.toString().substring(0, 8);
        UUID referralId = jdbc.sql("""
                        INSERT INTO "Referral" (
                            "referrerId", "referredId", "referralCode", status, "expiresAt",
                            "completedAt", "rewardsClaimed", "referrerReward", "referredReward"
                        ) VALUES (
                            :referrerId, :referredId, :code, CAST('COMPLETED' AS "ReferralStatus"),
                            NOW() + INTERVAL '30 days', NOW(), TRUE, 25, 15
                        )
                        RETURNING id
                        """)
                .param("referrerId", referrerId)
                .param("referredId", referredId)
                .param("code", uniqueCode)
                .query(UUID.class)
                .single();

        jdbc.sql("UPDATE \"User\" SET points = points + 25 WHERE id = :userId")
                .param("userId", referrerId).update();
        jdbc.sql("UPDATE \"User\" SET points = points + 15 WHERE id = :userId")
                .param("userId", referredId).update();

        jdbc.sql("""
                        INSERT INTO "XpLog" ("userId", type, "xpAmount", "refId") VALUES
                            (:referrerId, CAST('REFERRAL_SUCCESS' AS "XpEventType"), 25, :referralId),
                            (:referredId, CAST('REFERRAL_BONUS' AS "XpEventType"), 15, :referralId)
                        """)
                .param("referrerId", referrerId)
                .param("referredId", referredId)
                .param("referralId", referralId)
                .update();

        upsertStats(referrerId, 25, true);
        upsertStats(referredId, 15, false);
    }

    private void upsertStats(UUID userId, int xp, boolean referral) {
        jdbc.sql("""
                        INSERT INTO "UserStats" (
                            "userId", "totalXP", "weeklyXP", "monthlyXP", "totalReferrals"
                        ) VALUES (:userId, :xp, :xp, :xp, :referrals)
                        ON CONFLICT ("userId") DO UPDATE SET
                            "totalXP" = "UserStats"."totalXP" + :xp,
                            "weeklyXP" = "UserStats"."weeklyXP" + :xp,
                            "monthlyXP" = "UserStats"."monthlyXP" + :xp,
                            "totalReferrals" = "UserStats"."totalReferrals" + :referrals
                        """)
                .param("userId", userId)
                .param("xp", xp)
                .param("referrals", referral ? 1 : 0)
                .update();
    }
}
