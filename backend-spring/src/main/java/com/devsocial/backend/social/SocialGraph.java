package com.devsocial.backend.social;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * The social-graph seam. Implementations own privacy checks, relationship mutations,
 * follow-request state, and denormalized counter consistency.
 */
public interface SocialGraph {
    Map<String, Object> profile(String username, Optional<UUID> viewerId, boolean summaryOnly);
    Map<String, Object> follow(UUID actorId, UUID targetId);
    Map<String, Object> unfollow(UUID actorId, UUID targetId);
    Map<String, Object> followState(UUID actorId, UUID targetId);
    Map<String, Object> incomingRequests(UUID actorId, int page, int limit);
    Map<String, Object> outgoingRequests(UUID actorId, int page, int limit);
    Map<String, Object> acceptRequest(UUID actorId, UUID requestId);
    Map<String, Object> rejectRequest(UUID actorId, UUID requestId);
    Map<String, Object> cancelRequest(UUID actorId, UUID requestId);
    Map<String, Object> followers(UUID userId, int page, int limit);
    Map<String, Object> following(UUID userId, int page, int limit);
    List<Map<String, Object>> mutualFollowers(UUID actorId, UUID userId);
    Map<String, Object> blockedUsers(UUID actorId);
    Map<String, Object> block(UUID actorId, UUID targetId);
    Map<String, Object> unblock(UUID actorId, UUID targetId);
}
