package com.devsocial.backend.communities;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Web-community workflow seam: catalog, membership, invitations, moderation, and posts. */
public interface Communities {
    Map<String, Object> findAll(int page, int limit, String search, String category, Optional<UUID> viewerId);
    Map<String, Object> create(UUID userId, CreateCommunityRequest request);
    Map<String, Object> findOne(String idOrSlug, Optional<UUID> viewerId);
    Map<String, Object> toggleMembership(UUID userId, String idOrSlug);
    Map<String, Object> findPosts(String idOrSlug, int page, int limit, Optional<UUID> viewerId);
    Map<String, Object> createPost(UUID userId, String idOrSlug, CreateCommunityPostRequest request);
    Map<String, Object> invitations(UUID userId, int page, int limit);
    Map<String, Object> respondToInvite(UUID userId, UUID inviteId, boolean accept);
    Map<String, Object> cancelJoinRequest(UUID userId, UUID requestId);
    Map<String, Object> joinRequests(UUID actorId, String idOrSlug, int page, int limit);
    Map<String, Object> reviewJoinRequest(UUID actorId, String idOrSlug, UUID requestId, boolean accept);
    Map<String, Object> invite(UUID actorId, String idOrSlug, UUID inviteeId);
}
