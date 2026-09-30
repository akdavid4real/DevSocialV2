package com.devsocial.backend.social;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcSocialGraph implements SocialGraph {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcSocialGraph.class);
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate sideEffects;

    public JdbcSocialGraph(
            JdbcClient jdbc,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.sideEffects = new TransactionTemplate(transactionManager);
        this.sideEffects.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> profile(String username, Optional<UUID> viewerId, boolean summaryOnly) {
        SocialUser user = findByUsername(username).orElseThrow(() -> notFound(username));
        UUID viewer = viewerId.orElse(null);
        if (viewer != null && !viewer.equals(user.id()) && blockedBetween(viewer, user.id())) {
            throw notFound(username);
        }

        boolean self = user.id().equals(viewer);
        boolean following = self || (viewer != null && follows(viewer, user.id()));
        FollowRequest request = viewer == null || self ? null : request(viewer, user.id()).orElse(null);
        boolean privateProfile = isPrivate(user.privacySettings());
        boolean canView = !privateProfile || following || self;
        if (!summaryOnly && !canView) {
            throw notFound(username);
        }

        if (!summaryOnly) {
            return user.fullProfile();
        }

        Map<String, Object> result = user.summary();
        result.put("isPrivate", privateProfile);
        result.put("canViewContent", canView);
        result.put("isFollowing", following);
        result.put("followRequested", request != null && "PENDING".equals(request.status()));
        result.put("requestId", request != null && "PENDING".equals(request.status()) ? request.id() : null);
        result.put("requestStatus", request == null ? null : request.status());
        result.put("bio", "");
        result.put("affiliation", "");
        result.put("techStack", List.of());
        result.put("interests", List.of());
        result.put("points", 0);
        result.put("badges", List.of());
        result.put("location", "");
        result.put("website", "");
        result.put("githubUsername", "");
        result.put("linkedinUrl", "");
        return result;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> follow(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) {
            throw badRequest("Cannot follow yourself");
        }
        SocialUser target = findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (blockedBetween(actorId, targetId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Following is not available between these users");
        }
        if (follows(actorId, targetId)) {
            throw badRequest("Already following this user");
        }

        if (isPrivate(target.privacySettings())) {
            FollowRequest request = jdbc.sql("""
                            INSERT INTO public.follow_requests
                                (requester_id, target_id, status, responded_at, created_at)
                            VALUES (:actorId, :targetId, 'PENDING', NULL, now())
                            ON CONFLICT (requester_id, target_id)
                            DO UPDATE SET status = 'PENDING', responded_at = NULL,
                                created_at = CASE
                                    WHEN public.follow_requests.status = 'PENDING'
                                    THEN public.follow_requests.created_at ELSE now() END
                            RETURNING id, status
                            """)
                    .param("actorId", actorId)
                    .param("targetId", targetId)
                    .query((rs, row) -> new FollowRequest(rs.getObject("id", UUID.class), rs.getString("status")))
                    .single();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("following", false);
            result.put("requested", true);
            result.put("requestId", request.id());
            result.put("requestStatus", request.status());
            result.put("message", "Follow request sent to @" + target.username());
            afterCommit(() -> notifyPrivateRequest(actorId, targetId));
            return result;
        }

        int inserted = jdbc.sql("""
                        INSERT INTO "Follow" (id, "followerId", "followingId")
                        VALUES (:id, :actorId, :targetId)
                        ON CONFLICT ("followerId", "followingId") DO NOTHING
                        """)
                .param("id", UUID.randomUUID())
                .param("actorId", actorId)
                .param("targetId", targetId)
                .update();
        if (inserted == 0) {
            throw badRequest("Already following this user");
        }
        incrementCounters(actorId, targetId);
        afterCommit(() -> emitPublicFollow(actorId, targetId));
        return successState(true, false, "User followed successfully");
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> unfollow(UUID actorId, UUID targetId) {
        int deleted = jdbc.sql("DELETE FROM \"Follow\" WHERE \"followerId\" = :actorId AND \"followingId\" = :targetId")
                .param("actorId", actorId)
                .param("targetId", targetId)
                .update();
        if (deleted == 0) {
            throw badRequest("Not following this user");
        }
        decrementCounters(actorId, targetId);
        return successState(false, false, "User unfollowed successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> followState(UUID actorId, UUID targetId) {
        FollowRequest request = request(actorId, targetId).orElse(null);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("isFollowing", follows(actorId, targetId) && !blockedBetween(actorId, targetId));
        result.put("requestId", request != null && "PENDING".equals(request.status()) ? request.id() : null);
        result.put("requestStatus", request == null ? null : request.status());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> incomingRequests(UUID actorId, int page, int limit) {
        return requestPage(actorId, true, page, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> outgoingRequests(UUID actorId, int page, int limit) {
        return requestPage(actorId, false, page, limit);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> acceptRequest(UUID actorId, UUID requestId) {
        RequestPair pair = lockPendingRequest(requestId, actorId, true);
        if (blockedBetween(pair.requesterId(), pair.targetId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Following is not available between these users");
        }
        int inserted = jdbc.sql("""
                        INSERT INTO "Follow" (id, "followerId", "followingId")
                        VALUES (:id, :requesterId, :targetId)
                        ON CONFLICT ("followerId", "followingId") DO NOTHING
                        """)
                .param("id", UUID.randomUUID())
                .param("requesterId", pair.requesterId())
                .param("targetId", pair.targetId())
                .update();
        if (inserted > 0) {
            incrementCounters(pair.requesterId(), pair.targetId());
        }
        updateRequest(requestId, "ACCEPTED");
        afterCommit(() -> emitAcceptedRequest(pair.requesterId(), pair.targetId()));
        return Map.of("success", true, "following", true, "requestStatus", "ACCEPTED");
    }

    @Override
    @Transactional
    public Map<String, Object> rejectRequest(UUID actorId, UUID requestId) {
        lockPendingRequest(requestId, actorId, true);
        updateRequest(requestId, "REJECTED");
        return Map.of("success", true, "requestStatus", "REJECTED");
    }

    @Override
    @Transactional
    public Map<String, Object> cancelRequest(UUID actorId, UUID requestId) {
        lockPendingRequest(requestId, actorId, false);
        updateRequest(requestId, "CANCELLED");
        return Map.of("success", true, "requestStatus", "CANCELLED");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> followers(UUID userId, int page, int limit) {
        return relationshipPage(userId, true, page, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> following(UUID userId, int page, int limit) {
        return relationshipPage(userId, false, page, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> mutualFollowers(UUID actorId, UUID userId) {
        return jdbc.sql("""
                        SELECT u.id, u.username, u."displayName", u.avatar, u.level
                        FROM "Follow" mine
                        JOIN "Follow" theirs ON theirs."followerId" = mine."followingId"
                        JOIN "User" u ON u.id = mine."followingId"
                        WHERE mine."followerId" = :actorId AND theirs."followingId" = :userId
                        LIMIT 10
                        """)
                .param("actorId", actorId)
                .param("userId", userId)
                .query((rs, row) -> compactUser(rs, false))
                .list();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> blockedUsers(UUID actorId) {
        List<Map<String, Object>> users = jdbc.sql("""
                        SELECT u.id, u.username, u."displayName", u.avatar, b."createdAt" AS "blockedAt"
                        FROM "Block" b JOIN "User" u ON u.id = b."blockedId"
                        WHERE b."blockerId" = :actorId
                        ORDER BY b."createdAt" DESC
                        """)
                .param("actorId", actorId)
                .query((rs, row) -> {
                    Map<String, Object> user = compactUser(rs, false);
                    user.remove("level");
                    user.remove("followersCount");
                    user.put("blockedAt", instant(rs, "blockedAt"));
                    return user;
                }).list();
        return Map.of("data", users);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> block(UUID actorId, UUID targetId) {
        if (actorId.equals(targetId)) {
            throw badRequest("Cannot block yourself");
        }
        SocialUser target = findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        jdbc.sql("""
                        INSERT INTO "Block" (id, "blockerId", "blockedId")
                        VALUES (:id, :actorId, :targetId)
                        ON CONFLICT ("blockerId", "blockedId") DO NOTHING
                        """)
                .param("id", UUID.randomUUID())
                .param("actorId", actorId)
                .param("targetId", targetId)
                .update();

        List<RequestPair> removed = jdbc.sql("""
                        DELETE FROM "Follow"
                        WHERE ("followerId" = :actorId AND "followingId" = :targetId)
                           OR ("followerId" = :targetId AND "followingId" = :actorId)
                        RETURNING "followerId", "followingId"
                        """)
                .param("actorId", actorId)
                .param("targetId", targetId)
                .query((rs, row) -> new RequestPair(
                        rs.getObject("followerId", UUID.class), rs.getObject("followingId", UUID.class)))
                .list();
        removed.forEach(pair -> decrementCounters(pair.requesterId(), pair.targetId()));

        return Map.of(
                "success", true,
                "message", "Blocked @" + target.username(),
                "data", Map.of("blockedId", targetId)
        );
    }

    @Override
    @Transactional
    public Map<String, Object> unblock(UUID actorId, UUID targetId) {
        jdbc.sql("DELETE FROM \"Block\" WHERE \"blockerId\" = :actorId AND \"blockedId\" = :targetId")
                .param("actorId", actorId)
                .param("targetId", targetId)
                .update();
        return Map.of("success", true, "message", "User unblocked successfully");
    }

    private Optional<SocialUser> findByUsername(String username) {
        return jdbc.sql(profileSql() + " WHERE LOWER(username) = LOWER(:username) LIMIT 1")
                .param("username", username)
                .query(this::socialUser)
                .optional();
    }

    private Optional<SocialUser> findById(UUID id) {
        return jdbc.sql(profileSql() + " WHERE id = :id LIMIT 1")
                .param("id", id)
                .query(this::socialUser)
                .optional();
    }

    private String profileSql() {
        return """
                SELECT id, username, "displayName", bio, avatar, "bannerUrl", affiliation,
                       "techStack", interests, "experienceLevel"::text AS "experienceLevel",
                       points, level, badges, location, website, "githubUsername", "linkedinUrl",
                       "createdAt", "followersCount", "followingCount", "isVerified", "privacySettings"::text
                FROM "User"
                """;
    }

    private SocialUser socialUser(ResultSet rs, int row) throws SQLException {
        return new SocialUser(
                rs.getObject("id", UUID.class), rs.getString("username"), rs.getString("displayName"),
                rs.getString("bio"), rs.getString("avatar"), rs.getString("bannerUrl"),
                rs.getString("affiliation"), strings(rs, "techStack"), strings(rs, "interests"),
                rs.getString("experienceLevel"), rs.getInt("points"), rs.getInt("level"),
                strings(rs, "badges"), rs.getString("location"), rs.getString("website"),
                rs.getString("githubUsername"), rs.getString("linkedinUrl"), instant(rs, "createdAt"),
                rs.getInt("followersCount"), rs.getInt("followingCount"), rs.getBoolean("isVerified"),
                jsonObject(rs.getString("privacySettings"))
        );
    }

    private boolean blockedBetween(UUID first, UUID second) {
        return jdbc.sql("""
                        SELECT EXISTS(
                            SELECT 1 FROM "Block"
                            WHERE ("blockerId" = :first AND "blockedId" = :second)
                               OR ("blockerId" = :second AND "blockedId" = :first)
                        )
                        """)
                .param("first", first).param("second", second).query(Boolean.class).single();
    }

    private boolean follows(UUID follower, UUID following) {
        return jdbc.sql("""
                        SELECT EXISTS(SELECT 1 FROM "Follow"
                            WHERE "followerId" = :follower AND "followingId" = :following)
                        """)
                .param("follower", follower).param("following", following).query(Boolean.class).single();
    }

    private Optional<FollowRequest> request(UUID requester, UUID target) {
        return jdbc.sql("""
                        SELECT id, status FROM public.follow_requests
                        WHERE requester_id = :requester AND target_id = :target LIMIT 1
                        """)
                .param("requester", requester).param("target", target)
                .query((rs, row) -> new FollowRequest(rs.getObject("id", UUID.class), rs.getString("status")))
                .optional();
    }

    private Map<String, Object> requestPage(UUID actorId, boolean incoming, int page, int limit) {
        String userJoin = incoming ? "u.id = fr.requester_id" : "u.id = fr.target_id";
        String ownerColumn = incoming ? "fr.target_id" : "fr.requester_id";
        String relatedId = incoming ? "fr.requester_id" : "fr.target_id";
        int offset = (page - 1) * limit;
        List<Map<String, Object>> requests = jdbc.sql("""
                        SELECT fr.id, fr.status, fr.created_at, %s AS related_id,
                               u.username, u."displayName", u.avatar, u.level
                        FROM public.follow_requests fr JOIN "User" u ON %s
                        WHERE %s = :actorId AND fr.status = 'PENDING'
                        ORDER BY fr.created_at DESC LIMIT :limit OFFSET :offset
                        """.formatted(relatedId, userJoin, ownerColumn))
                .param("actorId", actorId).param("limit", limit).param("offset", offset)
                .query((rs, row) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getObject("id", UUID.class));
                    item.put("status", rs.getString("status"));
                    item.put("createdAt", instant(rs, "created_at"));
                    Map<String, Object> user = new LinkedHashMap<>();
                    user.put("id", rs.getObject("related_id", UUID.class));
                    user.put("username", rs.getString("username"));
                    user.put("displayName", rs.getString("displayName"));
                    user.put("avatar", rs.getString("avatar"));
                    user.put("level", rs.getInt("level"));
                    item.put("user", user);
                    return item;
                }).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM public.follow_requests WHERE " + ownerColumn + " = :actorId AND status = 'PENDING'")
                .param("actorId", actorId).query(Long.class).single();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requests", requests);
        result.put("total", total);
        result.put("page", page);
        result.put("lastPage", (int) Math.ceil((double) total / limit));
        return result;
    }

    private RequestPair lockPendingRequest(UUID requestId, UUID actorId, boolean targetOwns) {
        String owner = targetOwns ? "target_id" : "requester_id";
        return jdbc.sql("""
                        SELECT requester_id, target_id FROM public.follow_requests
                        WHERE id = :requestId AND %s = :actorId AND status = 'PENDING' FOR UPDATE
                        """.formatted(owner))
                .param("requestId", requestId).param("actorId", actorId)
                .query((rs, row) -> new RequestPair(
                        rs.getObject("requester_id", UUID.class), rs.getObject("target_id", UUID.class)))
                .optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow request not found"));
    }

    private void updateRequest(UUID requestId, String status) {
        jdbc.sql("UPDATE public.follow_requests SET status = :status, responded_at = now() WHERE id = :requestId")
                .param("status", status).param("requestId", requestId).update();
    }

    private Map<String, Object> relationshipPage(UUID userId, boolean followers, int page, int limit) {
        String owner = followers ? "f.\"followingId\"" : "f.\"followerId\"";
        String related = followers ? "f.\"followerId\"" : "f.\"followingId\"";
        int offset = (page - 1) * limit;
        List<Map<String, Object>> users = jdbc.sql("""
                        SELECT u.id, u.username, u."displayName", u.avatar, u.level, u."followersCount"
                        FROM "Follow" f JOIN "User" u ON u.id = %s
                        WHERE %s = :userId ORDER BY f."createdAt" DESC LIMIT :limit OFFSET :offset
                        """.formatted(related, owner))
                .param("userId", userId).param("limit", limit).param("offset", offset)
                .query((rs, row) -> compactUser(rs, true)).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"Follow\" f WHERE " + owner + " = :userId")
                .param("userId", userId).query(Long.class).single();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put(followers ? "followers" : "following", users);
        result.put("total", total);
        result.put("page", page);
        result.put("lastPage", (int) Math.ceil((double) total / limit));
        return result;
    }

    private Map<String, Object> compactUser(ResultSet rs, boolean withFollowersCount) throws SQLException {
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", rs.getObject("id", UUID.class));
        user.put("username", rs.getString("username"));
        user.put("displayName", rs.getString("displayName"));
        user.put("avatar", rs.getString("avatar"));
        if (hasColumn(rs, "level")) user.put("level", rs.getInt("level"));
        if (withFollowersCount) user.put("followersCount", rs.getInt("followersCount"));
        return user;
    }

    private void incrementCounters(UUID follower, UUID following) {
        jdbc.sql("UPDATE \"User\" SET \"followingCount\" = \"followingCount\" + 1 WHERE id = :id")
                .param("id", follower).update();
        jdbc.sql("UPDATE \"User\" SET \"followersCount\" = \"followersCount\" + 1 WHERE id = :id")
                .param("id", following).update();
    }

    private void decrementCounters(UUID follower, UUID following) {
        jdbc.sql("UPDATE \"User\" SET \"followingCount\" = GREATEST(\"followingCount\" - 1, 0) WHERE id = :id")
                .param("id", follower).update();
        jdbc.sql("UPDATE \"User\" SET \"followersCount\" = GREATEST(\"followersCount\" - 1, 0) WHERE id = :id")
                .param("id", following).update();
    }

    private Map<String, Object> successState(boolean following, boolean requested, String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("following", following);
        result.put("requested", requested);
        result.put("message", message);
        return result;
    }

    private void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safely(action);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safely(() -> sideEffects.executeWithoutResult(status -> action.run()));
            }
        });
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException exception) {
            LOGGER.warn("Social notification side effect failed: {}", exception.getMessage());
        }
    }

    private void notifyPrivateRequest(UUID requesterId, UUID targetId) {
        insertNotification(
                targetId, requesterId, "SYSTEM", "New follow request",
                "requested to follow you", requesterId, "/settings/follow-requests", true
        );
    }

    private void emitPublicFollow(UUID followerId, UUID targetId) {
        insertNotification(
                targetId, followerId, "FOLLOW", "👤 New Follower",
                "started following you", followerId, null, true
        );
        jdbc.sql("""
                        INSERT INTO "Activity" (id, "userId", type, description, metadata, "xpEarned")
                        SELECT :id, :followerId, CAST('USER_FOLLOWED' AS "ActivityType"),
                               'Followed @' || username,
                               jsonb_build_object('followedUserId', CAST(:targetId AS text)), 0
                        FROM "User" WHERE id = :targetId
                        """)
                .param("id", UUID.randomUUID())
                .param("followerId", followerId)
                .param("targetId", targetId)
                .update();
    }

    private void emitAcceptedRequest(UUID requesterId, UUID targetId) {
        insertNotification(
                targetId, requesterId, "FOLLOW", "👤 New Follower",
                "started following you", requesterId, null, true
        );
        insertNotification(
                requesterId, targetId, "SYSTEM", "Follow request accepted",
                "accepted your follow request", targetId, null, true
        );
    }

    private void insertNotification(
            UUID recipientId,
            UUID senderId,
            String type,
            String title,
            String messageSuffix,
            UUID relatedId,
            String fixedActionUrl,
            boolean includeSenderName
    ) {
        jdbc.sql("""
                        INSERT INTO "Notification"
                            (id, "recipientId", "senderId", type, title, message,
                             "relatedId", "relatedType", "actionUrl", "updatedAt")
                        SELECT :id, :recipientId, :senderId, CAST(:type AS "NotificationType"),
                               :title,
                               CASE WHEN :includeSenderName
                                    THEN COALESCE(NULLIF("displayName", ''), username, 'Someone') || ' ' || :messageSuffix
                                    ELSE :messageSuffix END,
                               :relatedId, 'user',
                               COALESCE(:fixedActionUrl, '/@' || username), now()
                        FROM "User" WHERE id = :senderId
                        """)
                .param("id", UUID.randomUUID())
                .param("recipientId", recipientId)
                .param("senderId", senderId)
                .param("type", type)
                .param("title", title)
                .param("includeSenderName", includeSenderName)
                .param("messageSuffix", messageSuffix)
                .param("relatedId", relatedId)
                .param("fixedActionUrl", fixedActionUrl)
                .update();
    }

    private boolean isPrivate(Map<String, Object> privacy) {
        return "PRIVATE".equalsIgnoreCase(String.valueOf(privacy.getOrDefault("profileVisibility", "PUBLIC")));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonObject(String value) {
        if (value == null || value.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(value, LinkedHashMap.class);
        } catch (JsonProcessingException exception) {
            return Map.of();
        }
    }

    private List<String> strings(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        if (value == null) return List.of();
        Object raw = value.getArray();
        if (!(raw instanceof Object[] values)) return List.of();
        List<String> result = new ArrayList<>();
        for (Object item : values) result.add(String.valueOf(item));
        return result;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private boolean hasColumn(ResultSet rs, String name) throws SQLException {
        for (int index = 1; index <= rs.getMetaData().getColumnCount(); index++) {
            if (name.equalsIgnoreCase(rs.getMetaData().getColumnLabel(index))) return true;
        }
        return false;
    }

    private ResponseStatusException notFound(String username) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "User @" + username + " not found");
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record FollowRequest(UUID id, String status) {}
    private record RequestPair(UUID requesterId, UUID targetId) {}

    private record SocialUser(
            UUID id, String username, String displayName, String bio, String avatar, String bannerUrl,
            String affiliation, List<String> techStack, List<String> interests, String experienceLevel,
            int points, int level, List<String> badges, String location, String website,
            String githubUsername, String linkedinUrl, Instant createdAt, int followersCount,
            int followingCount, boolean verified, Map<String, Object> privacySettings
    ) {
        Map<String, Object> fullProfile() {
            Map<String, Object> result = summary();
            result.remove("isVerified");
            result.put("bio", bio);
            result.put("affiliation", affiliation);
            result.put("techStack", techStack);
            result.put("interests", interests);
            result.put("experienceLevel", experienceLevel);
            result.put("points", points);
            result.put("badges", badges);
            result.put("location", location);
            result.put("website", website);
            result.put("githubUsername", githubUsername);
            result.put("linkedinUrl", linkedinUrl);
            return result;
        }

        Map<String, Object> summary() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", id);
            result.put("username", username);
            result.put("displayName", displayName);
            result.put("avatar", avatar);
            result.put("bannerUrl", bannerUrl);
            result.put("level", level);
            result.put("isVerified", verified);
            result.put("followersCount", followersCount);
            result.put("followingCount", followingCount);
            result.put("createdAt", createdAt);
            return result;
        }
    }
}
