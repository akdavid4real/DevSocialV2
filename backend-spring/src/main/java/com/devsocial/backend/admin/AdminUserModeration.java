package com.devsocial.backend.admin;

import java.util.Map;
import java.util.UUID;

interface AdminUserModeration {
    Map<String, Object> updateRole(UUID actorId, UUID userId, String role);

    Map<String, Object> ban(UUID actorId, UUID userId, BanAdminUserRequest request);

    Map<String, Object> unban(UUID actorId, UUID userId);

    Map<String, Object> resetPassword(UUID actorId, UUID userId, String newPassword);
}
