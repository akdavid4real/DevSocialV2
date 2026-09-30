package com.devsocial.backend.users;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface ProfileActivity {
    Map<String, Object> activities(Optional<UUID> viewerId, String username, int page, int limit);

    List<Map<String, Object>> likedPosts(Optional<UUID> viewerId, String username, int page, int limit);

    List<Map<String, Object>> commentedPosts(Optional<UUID> viewerId, String username, int page, int limit);

    Map<String, Object> stats(Optional<UUID> viewerId, String username);

    List<Map<String, Object>> heatmap(Optional<UUID> viewerId, String username);

    Map<String, Object> pin(UUID userId, String username, UUID postId);

    Map<String, Object> unpin(UUID userId, String username, UUID postId);

    List<Map<String, Object>> pinnedPosts(Optional<UUID> viewerId, String username);
}
