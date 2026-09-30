package com.devsocial.backend.social;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
public class SocialGraphController {
    private final SocialGraph graph;

    public SocialGraphController(SocialGraph graph) {
        this.graph = graph;
    }

    @GetMapping("/users/{username}")
    Map<String, Object> publicProfile(
            @PathVariable String username,
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return graph.profile(username, userId(principal), false);
    }

    @GetMapping("/profile-access/{username}")
    Map<String, Object> profileAccess(
            @PathVariable String username,
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return graph.profile(username, userId(principal), true);
    }

    @PostMapping("/follow/{userId}")
    Map<String, Object> follow(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.follow(principal.userId(), userId);
    }

    @DeleteMapping("/follow/{userId}")
    Map<String, Object> unfollow(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.unfollow(principal.userId(), userId);
    }

    @GetMapping("/follow/{userId}/is-following")
    Map<String, Object> followState(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.followState(principal.userId(), userId);
    }

    @GetMapping("/follow/requests/incoming")
    Map<String, Object> incoming(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return graph.incomingRequests(principal.userId(), page(page), limit(limit));
    }

    @GetMapping("/follow/requests/outgoing")
    Map<String, Object> outgoing(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return graph.outgoingRequests(principal.userId(), page(page), limit(limit));
    }

    @PostMapping("/follow/requests/{requestId}/accept")
    Map<String, Object> accept(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID requestId
    ) {
        return graph.acceptRequest(principal.userId(), requestId);
    }

    @PostMapping("/follow/requests/{requestId}/reject")
    Map<String, Object> reject(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID requestId
    ) {
        return graph.rejectRequest(principal.userId(), requestId);
    }

    @DeleteMapping("/follow/requests/{requestId}")
    Map<String, Object> cancel(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID requestId
    ) {
        return graph.cancelRequest(principal.userId(), requestId);
    }

    @GetMapping("/follow/{userId}/followers")
    Map<String, Object> followers(
            @PathVariable UUID userId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return graph.followers(userId, page(page), limit(limit));
    }

    @GetMapping("/follow/{userId}/following")
    Map<String, Object> following(
            @PathVariable UUID userId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return graph.following(userId, page(page), limit(limit));
    }

    @GetMapping("/follow/{userId}/mutual-followers")
    List<Map<String, Object>> mutualFollowers(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.mutualFollowers(principal.userId(), userId);
    }

    @GetMapping("/users/blocked")
    Map<String, Object> blocked(@AuthenticationPrincipal AuthenticatedUser principal) {
        return graph.blockedUsers(principal.userId());
    }

    @PostMapping("/users/block/{userId}")
    Map<String, Object> block(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.block(principal.userId(), userId);
    }

    @DeleteMapping("/users/unblock/{userId}")
    Map<String, Object> unblock(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId
    ) {
        return graph.unblock(principal.userId(), userId);
    }

    private Optional<UUID> userId(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : Optional.of(principal.userId());
    }

    private int page(Integer value) {
        return Math.max(value == null ? 1 : value, 1);
    }

    private int limit(Integer value) {
        return Math.min(Math.max(value == null ? 20 : value, 1), 100);
    }
}
