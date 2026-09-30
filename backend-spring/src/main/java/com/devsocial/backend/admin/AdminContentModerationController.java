package com.devsocial.backend.admin;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/admin")
public class AdminContentModerationController {
    private final AdminContentModeration moderation;

    public AdminContentModerationController(AdminContentModeration moderation) {
        this.moderation = moderation;
    }

    @GetMapping("/posts")
    Map<String, Object> findPosts(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false)
            @Pattern(regexp = "PENDING_REVIEW|ACTIVE|ARCHIVED|BLOCKED") String status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) int limit) {
        return moderation.findPosts(principal.userId(), status, page, limit);
    }

    @PutMapping("/posts/{postId}/status")
    Map<String, Object> updatePostStatus(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId, @Valid @RequestBody UpdateAdminPostStatusRequest request) {
        return moderation.updatePostStatus(principal.userId(), postId, request);
    }

    @DeleteMapping("/posts/{postId}")
    Map<String, Object> deletePost(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId, @RequestBody(required = false) DeleteAdminPostRequest request) {
        return moderation.deletePost(principal.userId(), postId, request == null ? null : request.reason());
    }

    @GetMapping("/audit-logs")
    Map<String, Object> findAuditLogs(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "50") @Min(1) int limit) {
        return moderation.findAuditLogs(principal.userId(), page, limit);
    }
}
