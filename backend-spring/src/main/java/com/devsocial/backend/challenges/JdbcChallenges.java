package com.devsocial.backend.challenges;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcChallenges implements Challenges {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcChallenges(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findActive(UUID userId) {
        String join = userId == null ? "" : """
                 LEFT JOIN "ChallengeParticipation" p
                   ON p."challengeId" = c.id AND p."userId" = :userId
                """;
        JdbcClient.StatementSpec statement = jdbc.sql(challengeProjection() + participationProjection(userId != null)
                + " FROM \"WeeklyChallenge\" c" + join + """
                 WHERE c."isActive" = true AND c."startDate" <= now() AND c."endDate" >= now()
                 ORDER BY c."endDate" ASC, c."createdAt" DESC
                """);
        if (userId != null) statement = statement.param("userId", userId);
        return statement.query((rs, row) -> {
            Map<String, Object> challenge = challenge(rs);
            challenge.put("participation", userId == null || rs.getObject("p_id") == null ? null : participation(rs));
            return challenge;
        }).list();
    }

    @Override
    @Transactional
    public Map<String, Object> create(UUID userId, CreateChallengeRequest request) {
        String role = jdbc.sql("SELECT role::text FROM \"User\" WHERE id = :id")
                .param("id", userId).query(String.class).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (!"ADMIN".equalsIgnoreCase(role) && !"MODERATOR".equalsIgnoreCase(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only admins or moderators can create challenges");
        if (!request.endDate().isAfter(request.startDate()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Challenge end date must be after start date");

        UUID id = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "WeeklyChallenge"
                          (id, title, description, type, difficulty, requirements, rewards, "startDate", "endDate",
                           "isActive", "participantCount", "completionCount", "firstCompletionBonus", "createdById",
                           "createdAt", "updatedAt")
                        VALUES (:id, :title, :description, CAST(:type AS "ChallengeType"),
                          CAST(:difficulty AS "ChallengeDifficulty"), CAST(:requirements AS jsonb),
                          CAST(:rewards AS jsonb), :startDate, :endDate, :isActive, 0, 0, :bonus, :userId, now(), now())
                        """).param("id", id).param("title", request.title().trim())
                .param("description", request.description().trim()).param("type", request.type())
                .param("difficulty", request.difficulty()).param("requirements", json(request.requirements()))
                .param("rewards", json(request.rewards())).param("startDate", Timestamp.from(request.startDate()))
                .param("endDate", Timestamp.from(request.endDate()))
                .param("isActive", request.isActive() == null || request.isActive())
                .param("bonus", request.firstCompletionBonus() == null ? 10 : request.firstCompletionBonus())
                .param("userId", userId).update();
        return findChallenge(id).orElseThrow(this::challengeNotFound);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findUserChallenges(UUID userId) {
        return jdbc.sql(challengeProjection() + participationProjection(true) + """
                         FROM "ChallengeParticipation" p
                         JOIN "WeeklyChallenge" c ON c.id = p."challengeId"
                         WHERE p."userId" = :userId ORDER BY p."createdAt" DESC
                        """).param("userId", userId).query((rs, row) -> {
                    Map<String, Object> result = participation(rs);
                    result.put("challenge", challenge(rs));
                    return result;
                }).list();
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> join(UUID userId, UUID challengeId) {
        ChallengeWindow window = jdbc.sql("""
                        SELECT "isActive", "startDate", "endDate" FROM "WeeklyChallenge"
                        WHERE id = :id FOR UPDATE
                        """).param("id", challengeId).query((rs, row) -> new ChallengeWindow(
                        rs.getBoolean("isActive"), instant(rs, "startDate"), instant(rs, "endDate")))
                .optional().orElseThrow(this::inactiveChallenge);
        Instant now = Instant.now();
        if (!window.active() || window.start().isAfter(now) || window.end().isBefore(now))
            throw inactiveChallenge();
        boolean exists = jdbc.sql("""
                        SELECT EXISTS(SELECT 1 FROM "ChallengeParticipation"
                          WHERE "userId" = :userId AND "challengeId" = :challengeId)
                        """).param("userId", userId).param("challengeId", challengeId)
                .query(Boolean.class).single();
        if (exists) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Already participating in this challenge");

        UUID participationId = UUID.randomUUID();
        jdbc.sql("""
                        INSERT INTO "ChallengeParticipation"
                          (id, "userId", "challengeId", status, progress, "isFirstCompletion", "xpEarned",
                           "createdAt", "updatedAt")
                        VALUES (:id, :userId, :challengeId, CAST('ACTIVE' AS "ProgressStatus"), 0, false, 0,
                          now(), now())
                        """).param("id", participationId).param("userId", userId)
                .param("challengeId", challengeId).update();
        jdbc.sql("UPDATE \"WeeklyChallenge\" SET \"participantCount\" = \"participantCount\" + 1, "
                + "\"updatedAt\" = now() WHERE id = :id").param("id", challengeId).update();
        awardPoints(userId, challengeId, "DAILY_CHALLENGE", 50);
        return findParticipation(userId, challengeId).orElseThrow();
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> submit(UUID userId, UUID challengeId, SubmitChallengeProgressRequest request) {
        Map<String, Object> current = lockedParticipation(userId, challengeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Join the challenge before submitting progress"));
        if ("COMPLETED".equals(current.get("status"))) return current;

        int progress = Math.max((Integer) current.get("progress"), request.progress());
        boolean completed = progress >= 100;
        int xpEarned = (Integer) current.get("xpEarned");
        boolean firstCompletion = (Boolean) current.get("isFirstCompletion");
        if (completed) {
            long completedCount = jdbc.sql("""
                            SELECT COUNT(*) FROM "ChallengeParticipation"
                            WHERE "challengeId" = :challengeId AND status = CAST('COMPLETED' AS "ProgressStatus")
                            """).param("challengeId", challengeId).query(Long.class).single();
            firstCompletion = completedCount == 0;
            @SuppressWarnings("unchecked")
            Map<String, Object> challenge = (Map<String, Object>) current.get("challenge");
            xpEarned = xpReward(challenge.get("rewards"))
                    + (firstCompletion ? (Integer) challenge.get("firstCompletionBonus") : 0);
            jdbc.sql("UPDATE \"WeeklyChallenge\" SET \"completionCount\" = \"completionCount\" + 1, "
                    + "\"updatedAt\" = now() WHERE id = :id").param("id", challengeId).update();
            awardPoints(userId, challengeId, "CHALLENGE_COMPLETION", xpEarned);
            updateStats(userId, xpEarned);
        }

        String submission = request.submissionData() == null
                ? json(current.get("submissionData")) : json(request.submissionData());
        jdbc.sql("""
                        UPDATE "ChallengeParticipation" SET progress = :progress,
                          "submissionData" = CAST(:submission AS jsonb),
                          status = CAST(:status AS "ProgressStatus"),
                          "completedAt" = :completedAt, "xpEarned" = :xpEarned,
                          "isFirstCompletion" = :firstCompletion, "updatedAt" = now()
                        WHERE "userId" = :userId AND "challengeId" = :challengeId
                        """).param("progress", progress).param("submission", submission)
                .param("status", completed ? "COMPLETED" : "ACTIVE")
                .param("completedAt", completed ? Timestamp.from(Instant.now()) : null, java.sql.Types.TIMESTAMP)
                .param("xpEarned", xpEarned).param("firstCompletion", firstCompletion)
                .param("userId", userId).param("challengeId", challengeId).update();
        return findParticipation(userId, challengeId).orElseThrow();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> leaderboard(UUID challengeId) {
        boolean exists = jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"WeeklyChallenge\" WHERE id = :id)")
                .param("id", challengeId).query(Boolean.class).single();
        if (!exists) throw challengeNotFound();
        List<Map<String, Object>> rows = jdbc.sql(participationSelect() + """
                         , u.id AS u_id, u.username AS u_username, u."displayName" AS u_display_name,
                           u.avatar AS u_avatar, u.level AS u_level
                         FROM "ChallengeParticipation" p LEFT JOIN "User" u ON u.id = p."userId"
                         WHERE p."challengeId" = :challengeId
                         ORDER BY p.progress DESC, p."updatedAt" ASC LIMIT 25
                        """).param("challengeId", challengeId).query((rs, row) -> {
                    Map<String, Object> result = participation(rs);
                    UUID id = rs.getObject("u_id", UUID.class);
                    result.put("user", id == null ? null : mapNullable("id", id,
                            "username", rs.getString("u_username"), "displayName", rs.getString("u_display_name"),
                            "avatar", rs.getString("u_avatar"), "level", rs.getInt("u_level")));
                    return result;
                }).list();
        for (int index = 0; index < rows.size(); index++) rows.get(index).put("rank", index + 1);
        return rows;
    }

    private Optional<Map<String, Object>> lockedParticipation(UUID userId, UUID challengeId) {
        return jdbc.sql(challengeProjection() + participationProjection(true) + """
                         FROM "ChallengeParticipation" p JOIN "WeeklyChallenge" c ON c.id = p."challengeId"
                         WHERE p."userId" = :userId AND p."challengeId" = :challengeId FOR UPDATE OF p, c
                        """).param("userId", userId).param("challengeId", challengeId).query((rs, row) -> {
                    Map<String, Object> result = participation(rs);
                    result.put("challenge", challenge(rs));
                    return result;
                }).optional();
    }

    private Optional<Map<String, Object>> findParticipation(UUID userId, UUID challengeId) {
        return jdbc.sql(challengeProjection() + participationProjection(true) + """
                         FROM "ChallengeParticipation" p JOIN "WeeklyChallenge" c ON c.id = p."challengeId"
                         WHERE p."userId" = :userId AND p."challengeId" = :challengeId
                        """).param("userId", userId).param("challengeId", challengeId).query((rs, row) -> {
                    Map<String, Object> result = participation(rs);
                    result.put("challenge", challenge(rs));
                    return result;
                }).optional();
    }

    private Optional<Map<String, Object>> findChallenge(UUID challengeId) {
        return jdbc.sql(challengeProjection() + " FROM \"WeeklyChallenge\" c WHERE c.id = :id")
                .param("id", challengeId).query((rs, row) -> challenge(rs)).optional();
    }

    private void awardPoints(UUID userId, UUID refId, String type, int amount) {
        jdbc.sql("UPDATE \"User\" SET points = points + :amount, \"updatedAt\" = now() WHERE id = :id")
                .param("amount", amount).param("id", userId).update();
        jdbc.sql("""
                        INSERT INTO "XpLog" (id, "userId", type, "xpAmount", "refId", "createdAt")
                        VALUES (:id, :userId, CAST(:type AS "XpEventType"), :amount, :refId, now())
                        """).param("id", UUID.randomUUID()).param("userId", userId).param("type", type)
                .param("amount", amount).param("refId", refId).update();
    }

    private void updateStats(UUID userId, int amount) {
        jdbc.sql("""
                        INSERT INTO "UserStats"
                          (id, "userId", "totalXP", "weeklyXP", "monthlyXP", "challengesCompleted",
                           "lastActiveAt", "createdAt", "updatedAt")
                        VALUES (:id, :userId, :amount, :amount, :amount, 1, now(), now(), now())
                        ON CONFLICT ("userId") DO UPDATE SET
                          "totalXP" = "UserStats"."totalXP" + :amount,
                          "weeklyXP" = "UserStats"."weeklyXP" + :amount,
                          "monthlyXP" = "UserStats"."monthlyXP" + :amount,
                          "challengesCompleted" = "UserStats"."challengesCompleted" + 1,
                          "updatedAt" = now()
                        """).param("id", UUID.randomUUID()).param("userId", userId).param("amount", amount).update();
    }

    private int xpReward(Object rewards) {
        if (!(rewards instanceof Map<?, ?> values)) return 100;
        Object raw = values.get("xp");
        if (!(raw instanceof Number number)) return 100;
        int amount = number.intValue();
        return amount > 0 ? amount : 100;
    }

    private String challengeProjection() {
        return """
                SELECT c.id AS c_id, c.title AS c_title, c.description AS c_description,
                  c.type::text AS c_type, c.difficulty::text AS c_difficulty,
                  c.requirements::text AS c_requirements, c.rewards::text AS c_rewards,
                  c."startDate" AS c_start_date, c."endDate" AS c_end_date,
                  c."isActive" AS c_is_active, c."participantCount" AS c_participant_count,
                  c."completionCount" AS c_completion_count,
                  c."firstCompletionBonus" AS c_first_completion_bonus,
                  c."createdById" AS c_created_by_id, c."createdAt" AS c_created_at,
                  c."updatedAt" AS c_updated_at
                """;
    }

    private String participationProjection(boolean prefixed) {
        if (!prefixed) return "";
        return """
                , p.id AS p_id, p."userId" AS p_user_id, p."challengeId" AS p_challenge_id,
                  p.status::text AS p_status, p.progress AS p_progress,
                  p."completedAt" AS p_completed_at, p."isFirstCompletion" AS p_is_first_completion,
                  p."xpEarned" AS p_xp_earned, p."submissionData"::text AS p_submission_data,
                  p."createdAt" AS p_created_at, p."updatedAt" AS p_updated_at
                """;
    }

    private String participationSelect() {
        return """
                SELECT p.id AS p_id, p."userId" AS p_user_id, p."challengeId" AS p_challenge_id,
                  p.status::text AS p_status, p.progress AS p_progress,
                  p."completedAt" AS p_completed_at, p."isFirstCompletion" AS p_is_first_completion,
                  p."xpEarned" AS p_xp_earned, p."submissionData"::text AS p_submission_data,
                  p."createdAt" AS p_created_at, p."updatedAt" AS p_updated_at
                """;
    }

    private Map<String, Object> challenge(ResultSet rs) throws SQLException {
        return mapNullable("id", rs.getObject("c_id", UUID.class), "title", rs.getString("c_title"),
                "description", rs.getString("c_description"), "type", rs.getString("c_type"),
                "difficulty", rs.getString("c_difficulty"), "requirements", readJson(rs.getString("c_requirements")),
                "rewards", readJson(rs.getString("c_rewards")), "startDate", instant(rs, "c_start_date"),
                "endDate", instant(rs, "c_end_date"), "isActive", rs.getBoolean("c_is_active"),
                "participantCount", rs.getInt("c_participant_count"),
                "completionCount", rs.getInt("c_completion_count"),
                "firstCompletionBonus", rs.getInt("c_first_completion_bonus"),
                "createdById", rs.getObject("c_created_by_id", UUID.class),
                "createdAt", instant(rs, "c_created_at"), "updatedAt", instant(rs, "c_updated_at"));
    }

    private Map<String, Object> participation(ResultSet rs) throws SQLException {
        return mapNullable("id", rs.getObject("p_id", UUID.class),
                "userId", rs.getObject("p_user_id", UUID.class),
                "challengeId", rs.getObject("p_challenge_id", UUID.class), "status", rs.getString("p_status"),
                "progress", rs.getInt("p_progress"), "completedAt", instant(rs, "p_completed_at"),
                "isFirstCompletion", rs.getBoolean("p_is_first_completion"),
                "xpEarned", rs.getInt("p_xp_earned"), "submissionData", readJson(rs.getString("p_submission_data")),
                "createdAt", instant(rs, "p_created_at"), "updatedAt", instant(rs, "p_updated_at"));
    }

    private Object readJson(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Challenge JSON stored in PostgreSQL is invalid", exception);
        }
    }

    private String json(Object value) {
        if (value == null) return "null";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Challenge data is not valid JSON", exception);
        }
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException challengeNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Challenge not found");
    }

    private ResponseStatusException inactiveChallenge() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Challenge not found or inactive");
    }

    private record ChallengeWindow(boolean active, Instant start, Instant end) { }
}
