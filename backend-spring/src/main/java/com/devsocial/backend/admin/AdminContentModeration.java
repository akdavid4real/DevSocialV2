package com.devsocial.backend.admin;

import java.util.Map;
import java.util.UUID;

interface AdminContentModeration {
    Map<String, Object> findPosts(UUID actorId, String status, int page, int limit);

    Map<String, Object> updatePostStatus(UUID actorId, UUID postId, UpdateAdminPostStatusRequest request);

    Map<String, Object> deletePost(UUID actorId, UUID postId, String reason);

    Map<String, Object> findAuditLogs(UUID actorId, int page, int limit);
}
