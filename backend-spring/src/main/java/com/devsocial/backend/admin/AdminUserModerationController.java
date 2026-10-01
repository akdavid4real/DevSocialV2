package com.devsocial.backend.admin;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users/{userId}")
public class AdminUserModerationController {
    private final AdminUserModeration moderation;

    public AdminUserModerationController(AdminUserModeration moderation) {
        this.moderation = moderation;
    }

    @PutMapping("/role")
    Map<String, Object> updateRole(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId, @Valid @RequestBody UpdateAdminUserRoleRequest request) {
        return moderation.updateRole(principal.userId(), userId, request.role());
    }

    @PostMapping("/ban")
    Map<String, Object> ban(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId, @Valid @RequestBody BanAdminUserRequest request) {
        return moderation.ban(principal.userId(), userId, request);
    }

    @PostMapping("/unban")
    Map<String, Object> unban(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId) {
        return moderation.unban(principal.userId(), userId);
    }
}
