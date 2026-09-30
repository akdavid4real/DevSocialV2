package com.devsocial.backend.communities;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/communities")
public class CommunitiesController {
    private final Communities communities;

    public CommunitiesController(Communities communities) {
        this.communities = communities;
    }

    @GetMapping
    Map<String, Object> findAll(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category
    ) {
        return communities.findAll(page(page), limit(limit, 12, 50), search, category, userId(principal));
    }

    @PostMapping
    Map<String, Object> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateCommunityRequest request
    ) {
        return communities.create(principal.userId(), request);
    }

    @GetMapping("/invitations/me")
    Map<String, Object> invitations(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return communities.invitations(principal.userId(), page(page), limit(limit, 20, 100));
    }

    @PostMapping("/invitations/{inviteId}/accept")
    Map<String, Object> acceptInvite(@AuthenticationPrincipal AuthenticatedUser principal,
                                     @PathVariable UUID inviteId) {
        return communities.respondToInvite(principal.userId(), inviteId, true);
    }

    @PostMapping("/invitations/{inviteId}/reject")
    Map<String, Object> rejectInvite(@AuthenticationPrincipal AuthenticatedUser principal,
                                     @PathVariable UUID inviteId) {
        return communities.respondToInvite(principal.userId(), inviteId, false);
    }

    @DeleteMapping("/join-requests/{requestId}")
    Map<String, Object> cancelJoinRequest(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @PathVariable UUID requestId) {
        return communities.cancelJoinRequest(principal.userId(), requestId);
    }

    @GetMapping("/{idOrSlug}/join-requests")
    Map<String, Object> joinRequests(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String idOrSlug,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return communities.joinRequests(principal.userId(), idOrSlug, page(page), limit(limit, 20, 100));
    }

    @PostMapping("/{idOrSlug}/join-requests/{requestId}/accept")
    Map<String, Object> acceptJoinRequest(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @PathVariable String idOrSlug, @PathVariable UUID requestId) {
        return communities.reviewJoinRequest(principal.userId(), idOrSlug, requestId, true);
    }

    @PostMapping("/{idOrSlug}/join-requests/{requestId}/reject")
    Map<String, Object> rejectJoinRequest(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @PathVariable String idOrSlug, @PathVariable UUID requestId) {
        return communities.reviewJoinRequest(principal.userId(), idOrSlug, requestId, false);
    }

    @PostMapping("/{idOrSlug}/invites/{userId}")
    Map<String, Object> invite(@AuthenticationPrincipal AuthenticatedUser principal,
                               @PathVariable String idOrSlug, @PathVariable UUID userId) {
        return communities.invite(principal.userId(), idOrSlug, userId);
    }

    @GetMapping("/{idOrSlug}")
    Map<String, Object> findOne(@AuthenticationPrincipal AuthenticatedUser principal,
                                @PathVariable String idOrSlug) {
        return communities.findOne(idOrSlug, userId(principal));
    }

    @PostMapping("/{idOrSlug}/join")
    Map<String, Object> toggleMembership(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @PathVariable String idOrSlug) {
        return communities.toggleMembership(principal.userId(), idOrSlug);
    }

    @GetMapping("/{idOrSlug}/posts")
    Map<String, Object> posts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String idOrSlug,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return communities.findPosts(idOrSlug, page(page), limit(limit, 10, 50), userId(principal));
    }

    @PostMapping("/{idOrSlug}/posts")
    Map<String, Object> createPost(@AuthenticationPrincipal AuthenticatedUser principal,
                                   @PathVariable String idOrSlug,
                                   @Valid @RequestBody CreateCommunityPostRequest request) {
        return communities.createPost(principal.userId(), idOrSlug, request);
    }

    private int page(Integer value) {
        return value == null || value < 1 ? 1 : value;
    }

    private int limit(Integer value, int defaultValue, int maximum) {
        return value == null || value < 1 ? defaultValue : Math.min(value, maximum);
    }

    private Optional<UUID> userId(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : Optional.of(principal.userId());
    }
}
