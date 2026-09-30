package com.devsocial.backend.content;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Read-side seam for content visibility, hydration, pagination, and unique views. */
public interface ContentQueries {
    Object feed(Optional<UUID> viewerId, int page, int limit, String search);
    Map<String, Object> tagged(Optional<UUID> viewerId, String tagName, int page, int limit);
    Map<String, Object> post(UUID postId, Optional<UUID> viewerId, String ipAddress, String userAgent);
    Map<String, Object> comments(UUID postId, Optional<UUID> viewerId, int page, int limit);
    Map<String, Object> replies(UUID commentId, Optional<UUID> viewerId, int page, int limit);
    Object userPosts(String username, Optional<UUID> viewerId);
}
