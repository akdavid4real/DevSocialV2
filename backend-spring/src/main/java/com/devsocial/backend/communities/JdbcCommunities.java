package com.devsocial.backend.communities;

import com.devsocial.backend.content.ContentCommands;
import com.devsocial.backend.content.CreatePostRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcCommunities implements Communities {
    private final JdbcClient jdbc;
    private final ContentCommands content;
    private final ObjectMapper objectMapper;

    public JdbcCommunities(JdbcClient jdbc, ContentCommands content, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.content = content;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findAll(int page, int limit, String search, String category,
                                       Optional<UUID> viewerId) {
        StringBuilder filter = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parameters = new LinkedHashMap<>();
        if (search != null && !search.isBlank()) {
            filter.append(" AND (c.name ILIKE :search OR c.description ILIKE :search)");
            parameters.put("search", "%" + search + "%");
        }
        if (category != null && !category.isBlank()) {
            filter.append(" AND c.category = CAST(:category AS \"CommunityCategory\")");
            parameters.put("category", category.toUpperCase(Locale.ROOT));
        }
        String sql = communityProjection() + filter + " ORDER BY actual_member_count DESC, c.\"createdAt\" DESC LIMIT :limit OFFSET :offset";
        JdbcClient.StatementSpec statement = jdbc.sql(sql);
        for (Map.Entry<String, Object> parameter : parameters.entrySet()) {
            statement = statement.param(parameter.getKey(), parameter.getValue());
        }
        statement = statement.param("viewerId", viewerId.orElse(null)).param("limit", limit)
                .param("offset", (page - 1) * limit);
        List<Map<String, Object>> communities = statement.query(this::communityMap).list();

        JdbcClient.StatementSpec countStatement = jdbc.sql("SELECT COUNT(*) FROM \"Community\" c" + filter);
        for (Map.Entry<String, Object> parameter : parameters.entrySet()) {
            countStatement = countStatement.param(parameter.getKey(), parameter.getValue());
        }
        long total = countStatement.query(Long.class).single();
        return page("communities", communities, total, page, limit);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> create(UUID userId, CreateCommunityRequest request) {
        String slug = uniqueSlug(request.name());
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.sql("""
                        INSERT INTO "Community"
                          (id, name, slug, description, category, tags, "creatorId", "isPrivate", rules,
                           "memberCount", "postCount", "createdAt", "updatedAt")
                        VALUES (:id, :name, :slug, :description, CAST(:category AS "CommunityCategory"),
                                :tags, :creatorId, :isPrivate, :rules, 1, 0, :now, :now)
                        """)
                .param("id", id).param("name", request.name().trim()).param("slug", slug)
                .param("description", request.description().trim()).param("category", request.category())
                .param("tags", strings(request.tags())).param("creatorId", userId)
                .param("isPrivate", Boolean.TRUE.equals(request.isPrivate()))
                .param("rules", strings(nonBlank(request.rules()))).param("now", Timestamp.from(now)).update();
        jdbc.sql("""
                        INSERT INTO "CommunityMember" ("communityId", "userId", role, "joinedAt")
                        VALUES (:communityId, :userId, CAST('CREATOR' AS "CommunityMemberRole"), :now)
                        """)
                .param("communityId", id).param("userId", userId).param("now", Timestamp.from(now)).update();
        return withAllMembers(community(id, userId, true));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findOne(String idOrSlug, Optional<UUID> viewerId) {
        Map<String, Object> result = community(idOrSlug, viewerId.orElse(null), true);
        UUID communityId = (UUID) result.get("id");
        boolean joined = Boolean.TRUE.equals(result.get("isJoined"));
        withAllMembers(result);
        if (Boolean.TRUE.equals(result.get("isPrivate")) && !joined) redactMembers(result);
        result.put("canViewContent", !Boolean.TRUE.equals(result.get("isPrivate")) || joined);
        requestState(result, communityId, viewerId.orElse(null));
        return result;
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> toggleMembership(UUID userId, String idOrSlug) {
        Map<String, Object> current = withAllMembers(community(idOrSlug, userId, true));
        UUID communityId = (UUID) current.get("id");
        String role = memberRole(communityId, userId).orElse(null);
        if ("CREATOR".equals(role)) return membershipResult(true, false, current);
        if (Boolean.TRUE.equals(current.get("isPrivate")) && role == null) {
            Map<String, Object> requested = requestJoin(userId, current);
            redactMembers(current);
            requested.put("memberCount", current.get("memberCount"));
            requested.put("community", current);
            return requested;
        }
        if (role == null) {
            jdbc.sql("""
                            INSERT INTO "CommunityMember" ("communityId", "userId", role, "joinedAt")
                            VALUES (:communityId, :userId, CAST('MEMBER' AS "CommunityMemberRole"), now())
                            """).param("communityId", communityId).param("userId", userId).update();
            jdbc.sql("UPDATE \"Community\" SET \"memberCount\" = \"memberCount\" + 1, \"updatedAt\" = now() WHERE id = :id")
                    .param("id", communityId).update();
        } else {
            jdbc.sql("DELETE FROM \"CommunityMember\" WHERE \"communityId\" = :communityId AND \"userId\" = :userId")
                    .param("communityId", communityId).param("userId", userId).update();
            jdbc.sql("UPDATE \"Community\" SET \"memberCount\" = GREATEST(\"memberCount\" - 1, 0), \"updatedAt\" = now() WHERE id = :id")
                    .param("id", communityId).update();
        }
        return membershipResult(role == null, false, withAllMembers(community(communityId, userId, true)));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> findPosts(String idOrSlug, int page, int limit, Optional<UUID> viewerId) {
        Map<String, Object> community = community(idOrSlug, viewerId.orElse(null), false);
        UUID communityId = (UUID) community.get("id");
        List<Map<String, Object>> posts = jdbc.sql("""
                        SELECT p.id, p."authorId", p."communityId", p.content, p."isAnonymous",
                               p."imageUrl", p."imageUrls", p."videoUrls", p."likesCount", p."commentsCount",
                               p."viewsCount", p."xpAwarded", p.status::text AS status, p.slug, p."metaTitle",
                               p."metaDescription", p.poll::text AS poll, p."createdAt", p."updatedAt",
                               u.id AS user_id, u.username, u."displayName", u.avatar, u.level, u.role::text AS user_role,
                               (SELECT COUNT(*) FROM "Like" l WHERE l."targetId" = p.id AND l."targetType" = CAST('POST' AS "LikeTargetType")) AS actual_likes,
                               (SELECT COUNT(*) FROM "Comment" cm WHERE cm."postId" = p.id) AS actual_comments,
                               EXISTS(SELECT 1 FROM "Like" mine WHERE mine."targetId" = p.id
                                      AND mine."targetType" = CAST('POST' AS "LikeTargetType") AND mine."userId" = :viewerId) AS liked
                        FROM "Post" p JOIN "User" u ON u.id = p."authorId"
                        WHERE p."communityId" = :communityId AND p.status = CAST('ACTIVE' AS "PostStatus")
                        ORDER BY p."createdAt" DESC LIMIT :limit OFFSET :offset
                        """)
                .param("viewerId", viewerId.orElse(null)).param("communityId", communityId)
                .param("limit", limit).param("offset", (page - 1) * limit)
                .query(this::postMap).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM \"Post\" WHERE \"communityId\" = :id AND status = CAST('ACTIVE' AS \"PostStatus\")")
                .param("id", communityId).query(Long.class).single();
        return page("posts", posts, total, page, limit);
    }

    @Override
    @Transactional
    public Map<String, Object> createPost(UUID userId, String idOrSlug, CreateCommunityPostRequest request) {
        Map<String, Object> community = community(idOrSlug, userId, true);
        UUID communityId = (UUID) community.get("id");
        if (memberRole(communityId, userId).isEmpty()) throw forbidden("Join this community before posting");
        return content.createPost(userId, new CreatePostRequest(
                request.content(), List.of(), List.of(), false, null, communityId, List.of(), List.of()));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> invitations(UUID userId, int page, int limit) {
        List<Map<String, Object>> invites = jdbc.sql("""
                        SELECT ci.id, ci.status, ci.created_at, ci.community_id, c.name, c.slug, c.avatar,
                               ci.inviter_id, u.username, u."displayName"
                        FROM community_invites ci JOIN "Community" c ON c.id = ci.community_id
                        JOIN "User" u ON u.id = ci.inviter_id
                        WHERE ci.invitee_id = :userId AND ci.status = 'PENDING'
                        ORDER BY ci.created_at DESC LIMIT :limit OFFSET :offset
                        """).param("userId", userId).param("limit", limit).param("offset", (page - 1) * limit)
                .query((rs, row) -> {
                    Map<String, Object> invite = map("id", rs.getObject("id", UUID.class), "status", rs.getString("status"),
                            "createdAt", instant(rs, "created_at"));
                    invite.put("community", mapNullable("id", rs.getObject("community_id", UUID.class), "name", rs.getString("name"),
                            "slug", rs.getString("slug"), "avatar", rs.getString("avatar")));
                    invite.put("inviter", mapNullable("id", rs.getObject("inviter_id", UUID.class), "username", rs.getString("username"),
                            "displayName", rs.getString("displayName")));
                    return invite;
                }).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM community_invites WHERE invitee_id = :id AND status = 'PENDING'")
                .param("id", userId).query(Long.class).single();
        return page("invites", invites, total, page, limit);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> respondToInvite(UUID userId, UUID inviteId, boolean accept) {
        Invite invite = jdbc.sql("SELECT community_id, inviter_id, invitee_id, status FROM community_invites WHERE id = :id FOR UPDATE")
                .param("id", inviteId).query((rs, row) -> new Invite(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class),
                        rs.getObject(3, UUID.class), rs.getString(4))).optional()
                .filter(value -> value.inviteeId().equals(userId) && "PENDING".equals(value.status()))
                .orElseThrow(() -> notFound("Community invitation not found"));
        Map<String, Object> community = community(invite.communityId(), userId, true);
        if (accept) addMemberIfMissing(invite.communityId(), userId);
        jdbc.sql("UPDATE community_invites SET status = :status, responded_at = now() WHERE id = :id")
                .param("status", accept ? "ACCEPTED" : "REJECTED").param("id", inviteId).update();
        if (accept) jdbc.sql("""
                        UPDATE community_join_requests SET status = 'ACCEPTED', reviewed_by_id = :reviewer, reviewed_at = now()
                        WHERE community_id = :communityId AND user_id = :userId AND status = 'PENDING'
                        """).param("reviewer", invite.inviterId()).param("communityId", invite.communityId())
                .param("userId", userId).update();
        notifyUser(invite.inviterId(), userId, accept ? "Community invitation accepted" : "Community invitation declined",
                accept ? "Your invitation to " + community.get("name") + " was accepted"
                        : "Your invitation to " + community.get("name") + " was declined",
                invite.communityId(), "/communities/" + community.get("slug"));
        Map<String, Object> result = map("success", true, "accepted", accept);
        if (accept) result.put("community", map("id", community.get("id"), "name", community.get("name"), "slug", community.get("slug")));
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> cancelJoinRequest(UUID userId, UUID requestId) {
        int changed = jdbc.sql("""
                        UPDATE community_join_requests SET status = 'CANCELLED', reviewed_at = now()
                        WHERE id = :id AND user_id = :userId AND status = 'PENDING'
                        """).param("id", requestId).param("userId", userId).update();
        if (changed == 0) throw notFound("Join request not found");
        return map("success", true, "requestStatus", "CANCELLED");
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> joinRequests(UUID actorId, String idOrSlug, int page, int limit) {
        UUID communityId = managedCommunity(actorId, idOrSlug).id();
        List<Map<String, Object>> requests = jdbc.sql("""
                        SELECT r.id, r.status, r.created_at, u.id AS user_id, u.username,
                               u."displayName", u.avatar, u.level
                        FROM community_join_requests r JOIN "User" u ON u.id = r.user_id
                        WHERE r.community_id = :communityId AND r.status = 'PENDING'
                        ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset
                        """).param("communityId", communityId).param("limit", limit).param("offset", (page - 1) * limit)
                .query((rs, row) -> {
                    Map<String, Object> request = map("id", rs.getObject("id", UUID.class), "status", rs.getString("status"),
                            "createdAt", instant(rs, "created_at"));
                    request.put("user", mapNullable("id", rs.getObject("user_id", UUID.class), "username", rs.getString("username"),
                            "displayName", rs.getString("displayName"), "avatar", rs.getString("avatar"), "level", rs.getInt("level")));
                    return request;
                }).list();
        long total = jdbc.sql("SELECT COUNT(*) FROM community_join_requests WHERE community_id = :id AND status = 'PENDING'")
                .param("id", communityId).query(Long.class).single();
        return page("requests", requests, total, page, limit);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> reviewJoinRequest(UUID actorId, String idOrSlug, UUID requestId, boolean accept) {
        CommunityIdentity community = managedCommunity(actorId, idOrSlug);
        JoinRequest request = jdbc.sql("SELECT community_id, user_id, status FROM community_join_requests WHERE id = :id FOR UPDATE")
                .param("id", requestId).query((rs, row) -> new JoinRequest(rs.getObject(1, UUID.class),
                        rs.getObject(2, UUID.class), rs.getString(3))).optional()
                .filter(value -> value.communityId().equals(community.id()) && "PENDING".equals(value.status()))
                .orElseThrow(() -> notFound("Join request not found"));
        if (accept) addMemberIfMissing(community.id(), request.userId());
        jdbc.sql("""
                        UPDATE community_join_requests SET status = :status, reviewed_by_id = :actorId, reviewed_at = now()
                        WHERE id = :id
                        """).param("status", accept ? "ACCEPTED" : "REJECTED").param("actorId", actorId)
                .param("id", requestId).update();
        if (accept) jdbc.sql("""
                        UPDATE community_invites SET status = 'ACCEPTED', responded_at = now()
                        WHERE community_id = :communityId AND invitee_id = :userId AND status = 'PENDING'
                        """).param("communityId", community.id()).param("userId", request.userId()).update();
        notifyUser(request.userId(), actorId, accept ? "Community request accepted" : "Community request declined",
                accept ? "Your request to join " + community.name() + " was accepted"
                        : "Your request to join " + community.name() + " was declined",
                community.id(), accept ? "/communities/" + community.slug() : "/communities");
        return map("success", true, "accepted", accept);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> invite(UUID actorId, String idOrSlug, UUID inviteeId) {
        CommunityIdentity community = managedCommunity(actorId, idOrSlug);
        if (actorId.equals(inviteeId)) throw badRequest("You are already in this community");
        boolean exists = jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"User\" WHERE id = :id)").param("id", inviteeId)
                .query(Boolean.class).single();
        if (!exists) throw notFound("User not found");
        if (memberRole(community.id(), inviteeId).isPresent()) throw badRequest("User is already a member");
        if (blocked(actorId, inviteeId)) throw forbidden("This user cannot be invited");
        UUID inviteId = jdbc.sql("""
                        INSERT INTO community_invites (community_id, inviter_id, invitee_id, status, responded_at, created_at)
                        VALUES (:communityId, :actorId, :inviteeId, 'PENDING', NULL, now())
                        ON CONFLICT (community_id, invitee_id) DO UPDATE SET inviter_id = EXCLUDED.inviter_id,
                          status = 'PENDING', responded_at = NULL,
                          created_at = CASE WHEN community_invites.status = 'PENDING' THEN community_invites.created_at ELSE now() END
                        RETURNING id
                        """).param("communityId", community.id()).param("actorId", actorId).param("inviteeId", inviteeId)
                .query(UUID.class).single();
        notifyUser(inviteeId, actorId, "Community invitation", "You were invited to join " + community.name(),
                community.id(), "/communities/invitations");
        return map("success", true, "inviteId", inviteId, "status", "PENDING");
    }

    private Map<String, Object> requestJoin(UUID userId, Map<String, Object> community) {
        UUID communityId = (UUID) community.get("id");
        UUID creatorId = (UUID) community.get("creatorId");
        if (blocked(userId, creatorId)) throw forbidden("Community access is not available");
        UUID requestId = jdbc.sql("""
                        INSERT INTO community_join_requests (community_id, user_id, status, reviewed_by_id, reviewed_at, created_at)
                        VALUES (:communityId, :userId, 'PENDING', NULL, NULL, now())
                        ON CONFLICT (community_id, user_id) DO UPDATE SET status = 'PENDING', reviewed_by_id = NULL,
                          reviewed_at = NULL, created_at = CASE WHEN community_join_requests.status = 'PENDING'
                          THEN community_join_requests.created_at ELSE now() END RETURNING id
                        """).param("communityId", communityId).param("userId", userId).query(UUID.class).single();
        String display = jdbc.sql("SELECT COALESCE(\"displayName\", username, 'Someone') FROM \"User\" WHERE id = :id")
                .param("id", userId).query(String.class).optional().orElse("Someone");
        notifyUser(creatorId, userId, "Community join request",
                display + " requested to join " + community.get("name"), communityId,
                "/communities/" + community.get("slug"));
        return map("success", true, "isJoined", false, "requested", true,
                "requestId", requestId, "requestStatus", "PENDING");
    }

    private Map<String, Object> community(String idOrSlug, UUID viewerId, boolean allowPrivate) {
        Optional<UUID> id = uuid(idOrSlug);
        String predicate = id.isPresent() ? "c.id = :value" : "c.slug = :value";
        JdbcClient.StatementSpec statement = jdbc.sql(communityProjection() + " WHERE " + predicate)
                .param("viewerId", viewerId);
        statement = id.isPresent() ? statement.param("value", id.get()) : statement.param("value", idOrSlug);
        Map<String, Object> result = statement.query(this::communityMap).optional()
                .orElseThrow(() -> notFound("Community not found"));
        if (!allowPrivate && Boolean.TRUE.equals(result.get("isPrivate")) && !Boolean.TRUE.equals(result.get("isJoined")))
            throw notFound("Community not found");
        return result;
    }

    private Map<String, Object> community(UUID id, UUID viewerId, boolean allowPrivate) {
        return community(id.toString(), viewerId, allowPrivate);
    }

    private String communityProjection() {
        return """
                SELECT c.id, c.name, c.slug, c.description, c.avatar, c.banner, c.category::text AS category,
                       c.tags, c."creatorId", c."isPrivate", c.rules, c."postCount", c."createdAt", c."updatedAt",
                       (SELECT COUNT(*) FROM "CommunityMember" all_members WHERE all_members."communityId" = c.id) AS actual_member_count,
                       CAST(:viewerId AS uuid) AS viewer_id,
                       (SELECT mine.role::text FROM "CommunityMember" mine
                        WHERE mine."communityId" = c.id AND mine."userId" = :viewerId) AS viewer_role,
                       EXISTS(SELECT 1 FROM "CommunityMember" mine WHERE mine."communityId" = c.id AND mine."userId" = :viewerId) AS joined
                FROM "Community" c
                """;
    }

    private Map<String, Object> communityMap(ResultSet rs, int row) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        String viewerRole = rs.getString("viewer_role");
        List<Map<String, Object>> members = viewerRole == null ? List.of() : List.of(map(
                "userId", rs.getObject("viewer_id", UUID.class), "role", viewerRole));
        Map<String, Object> result = mapNullable(
                "id", id, "name", rs.getString("name"), "slug", rs.getString("slug"),
                "description", rs.getString("description"), "avatar", rs.getString("avatar"),
                "banner", rs.getString("banner"), "category", rs.getString("category"),
                "tags", array(rs, "tags"), "creatorId", rs.getObject("creatorId", UUID.class),
                "isPrivate", rs.getBoolean("isPrivate"), "rules", array(rs, "rules"),
                "memberCount", rs.getLong("actual_member_count"), "postCount", rs.getInt("postCount"),
                "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"));
        result.put("members", members);
        result.put("memberIds", members.stream().map(member -> member.get("userId")).toList());
        result.put("isJoined", rs.getBoolean("joined"));
        return result;
    }

    private Map<String, Object> postMap(ResultSet rs, int row) throws SQLException {
        Map<String, Object> post = mapNullable("id", rs.getObject("id", UUID.class),
                "authorId", rs.getObject("authorId", UUID.class), "communityId", rs.getObject("communityId", UUID.class),
                "content", rs.getString("content"), "isAnonymous", rs.getBoolean("isAnonymous"),
                "imageUrl", rs.getString("imageUrl"), "imageUrls", array(rs, "imageUrls"),
                "videoUrls", array(rs, "videoUrls"), "likesCount", rs.getLong("actual_likes"),
                "commentsCount", rs.getLong("actual_comments"), "viewsCount", rs.getInt("viewsCount"),
                "xpAwarded", rs.getInt("xpAwarded"), "status", rs.getString("status"), "slug", rs.getString("slug"),
                "metaTitle", rs.getString("metaTitle"), "metaDescription", rs.getString("metaDescription"),
                "poll", json(rs.getString("poll")), "createdAt", instant(rs, "createdAt"), "updatedAt", instant(rs, "updatedAt"),
                "isLiked", rs.getBoolean("liked"));
        post.put("author", mapNullable("id", rs.getObject("user_id", UUID.class), "username", rs.getString("username"),
                "displayName", rs.getString("displayName"), "avatar", rs.getString("avatar"),
                "level", rs.getInt("level"), "role", rs.getString("user_role")));
        return post;
    }

    private CommunityIdentity managedCommunity(UUID actorId, String idOrSlug) {
        Map<String, Object> community = community(idOrSlug, actorId, true);
        UUID id = (UUID) community.get("id");
        String role = memberRole(id, actorId).orElse(null);
        if (!List.of("CREATOR", "MODERATOR").contains(role)) throw forbidden("Community manager access required");
        return new CommunityIdentity(id, (String) community.get("name"), (String) community.get("slug"));
    }

    private Optional<String> memberRole(UUID communityId, UUID userId) {
        return jdbc.sql("SELECT role::text FROM \"CommunityMember\" WHERE \"communityId\" = :communityId AND \"userId\" = :userId")
                .param("communityId", communityId).param("userId", userId).query(String.class).optional();
    }

    private void addMemberIfMissing(UUID communityId, UUID userId) {
        int added = jdbc.sql("""
                        INSERT INTO "CommunityMember" ("communityId", "userId", role, "joinedAt")
                        VALUES (:communityId, :userId, CAST('MEMBER' AS "CommunityMemberRole"), now())
                        ON CONFLICT ("communityId", "userId") DO NOTHING
                        """).param("communityId", communityId).param("userId", userId).update();
        if (added > 0) jdbc.sql("UPDATE \"Community\" SET \"memberCount\" = \"memberCount\" + 1, \"updatedAt\" = now() WHERE id = :id")
                .param("id", communityId).update();
    }

    private boolean blocked(UUID left, UUID right) {
        return jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"Block\" WHERE (\"blockerId\" = :left AND \"blockedId\" = :right) OR (\"blockerId\" = :right AND \"blockedId\" = :left))")
                .param("left", left).param("right", right).query(Boolean.class).single();
    }

    private void requestState(Map<String, Object> result, UUID communityId, UUID userId) {
        if (userId == null) {
            result.put("requestId", null); result.put("requestStatus", null);
            result.put("inviteId", null); result.put("inviteStatus", null); return;
        }
        jdbc.sql("SELECT id, status FROM community_join_requests WHERE community_id = :communityId AND user_id = :userId LIMIT 1")
                .param("communityId", communityId).param("userId", userId)
                .query((rs, row) -> new State(rs.getObject("id", UUID.class), rs.getString("status"))).optional()
                .ifPresentOrElse(state -> { result.put("requestId", "PENDING".equals(state.status()) ? state.id() : null); result.put("requestStatus", state.status()); },
                        () -> { result.put("requestId", null); result.put("requestStatus", null); });
        jdbc.sql("SELECT id, status FROM community_invites WHERE community_id = :communityId AND invitee_id = :userId LIMIT 1")
                .param("communityId", communityId).param("userId", userId)
                .query((rs, row) -> new State(rs.getObject("id", UUID.class), rs.getString("status"))).optional()
                .ifPresentOrElse(state -> { result.put("inviteId", "PENDING".equals(state.status()) ? state.id() : null); result.put("inviteStatus", state.status()); },
                        () -> { result.put("inviteId", null); result.put("inviteStatus", null); });
    }

    private void notifyUser(UUID recipientId, UUID senderId, String title, String message, UUID relatedId, String actionUrl) {
        jdbc.sql("""
                        INSERT INTO "Notification" (id, "recipientId", "senderId", type, title, message,
                          "relatedId", "relatedType", read, "actionUrl", "createdAt", "updatedAt")
                        VALUES (:id, :recipientId, :senderId, CAST('SYSTEM' AS "NotificationType"), :title, :message,
                          :relatedId, 'community', false, :actionUrl, now(), now())
                        """).param("id", UUID.randomUUID()).param("recipientId", recipientId).param("senderId", senderId)
                .param("title", title).param("message", message).param("relatedId", relatedId)
                .param("actionUrl", actionUrl).update();
    }

    private String uniqueSlug(String name) {
        String base = name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (base.isBlank()) throw badRequest("Community name must contain letters or numbers");
        String slug = base;
        for (int suffix = 1; jdbc.sql("SELECT EXISTS(SELECT 1 FROM \"Community\" WHERE slug = :slug)")
                .param("slug", slug).query(Boolean.class).single(); suffix++) slug = base + "-" + suffix;
        return slug;
    }

    private Map<String, Object> membershipResult(boolean joined, boolean requested, Map<String, Object> community) {
        return map("isJoined", joined, "requested", requested, "memberCount", community.get("memberCount"), "community", community);
    }

    private Map<String, Object> page(String key, Object values, long total, int page, int limit) {
        return map(key, values, "total", total, "page", page, "lastPage", (int) Math.ceil((double) total / limit));
    }

    private void redactMembers(Map<String, Object> community) {
        community.put("members", List.of()); community.put("memberIds", List.of());
    }

    private Map<String, Object> withAllMembers(Map<String, Object> community) {
        UUID communityId = (UUID) community.get("id");
        List<Map<String, Object>> members = jdbc.sql("""
                        SELECT "userId", role::text AS role FROM "CommunityMember"
                        WHERE "communityId" = :communityId ORDER BY "joinedAt" ASC
                        """).param("communityId", communityId).query((rs, row) -> map(
                        "userId", rs.getObject("userId", UUID.class), "role", rs.getString("role"))).list();
        community.put("members", members);
        community.put("memberIds", members.stream().map(member -> member.get("userId")).toList());
        return community;
    }

    private Optional<UUID> uuid(String value) {
        try { return Optional.of(UUID.fromString(value)); } catch (IllegalArgumentException exception) { return Optional.empty(); }
    }

    private List<String> nonBlank(List<String> values) {
        return values == null ? List.of() : values.stream().filter(value -> value != null && !value.isBlank()).toList();
    }

    private String[] strings(List<String> values) { return (values == null ? List.<String>of() : values).toArray(String[]::new); }

    private List<String> array(ResultSet rs, String column) throws SQLException {
        Array value = rs.getArray(column);
        return value == null ? List.of() : List.of((String[]) value.getArray());
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column); return timestamp == null ? null : timestamp.toInstant();
    }

    private Object json(String value) {
        if (value == null) return null;
        try {
            return objectMapper.readValue(value, new TypeReference<Object>() { });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Invalid post JSON", exception);
        }
    }

    private Map<String, Object> map(Object... values) { return mapNullable(values); }

    private Map<String, Object> mapNullable(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2) result.put((String) values[index], values[index + 1]);
        return result;
    }

    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
    private ResponseStatusException forbidden(String message) { return new ResponseStatusException(HttpStatus.FORBIDDEN, message); }
    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }

    private record CommunityIdentity(UUID id, String name, String slug) { }
    private record Invite(UUID communityId, UUID inviterId, UUID inviteeId, String status) { }
    private record JoinRequest(UUID communityId, UUID userId, String status) { }
    private record State(UUID id, String status) { }
}
