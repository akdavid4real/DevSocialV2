package com.devsocial.backend.users;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
public class ProfileActivityController {
    private static final Pattern INTEGER_PREFIX = Pattern.compile("^\\s*([+-]?\\d+)");

    private final ProfileActivity profiles;

    public ProfileActivityController(ProfileActivity profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/users/{username}/activities")
    Map<String, Object> activities(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String limit
    ) {
        Page requested = page(page, limit);
        return profiles.activities(userId(principal), username, requested.number(), requested.limit());
    }

    @GetMapping("/users/{username}/liked-posts")
    List<Map<String, Object>> likedPosts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String limit
    ) {
        Page requested = page(page, limit);
        return profiles.likedPosts(userId(principal), username, requested.number(), requested.limit());
    }

    @GetMapping("/users/{username}/commented-posts")
    List<Map<String, Object>> commentedPosts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String limit
    ) {
        Page requested = page(page, limit);
        return profiles.commentedPosts(userId(principal), username, requested.number(), requested.limit());
    }

    @GetMapping("/users/{username}/stats")
    Map<String, Object> stats(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username
    ) {
        return profiles.stats(userId(principal), username);
    }

    @GetMapping("/users/{username}/activity-heatmap")
    List<Map<String, Object>> heatmap(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username
    ) {
        return profiles.heatmap(userId(principal), username);
    }

    @PostMapping("/users/{username}/pin-post")
    Map<String, Object> pin(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username,
            @Valid @RequestBody PinPostRequest request
    ) {
        return profiles.pin(principal.userId(), username, request.postId());
    }

    @DeleteMapping("/users/{username}/unpin-post/{postId}")
    Map<String, Object> unpin(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username,
            @PathVariable UUID postId
    ) {
        return profiles.unpin(principal.userId(), username, postId);
    }

    @GetMapping("/users/{username}/pinned-posts")
    List<Map<String, Object>> pinnedPosts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username
    ) {
        return profiles.pinnedPosts(userId(principal), username);
    }

    private Optional<UUID> userId(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : Optional.of(principal.userId());
    }

    private Page page(String page, String limit) {
        return new Page(parse(page, 1, Integer.MAX_VALUE), parse(limit, 20, 100));
    }

    private int parse(String value, int fallback, int maximum) {
        if (value == null) return fallback;
        Matcher matcher = INTEGER_PREFIX.matcher(value);
        if (!matcher.find()) return fallback;
        try {
            BigInteger parsed = new BigInteger(matcher.group(1));
            if (parsed.compareTo(BigInteger.ONE) < 0) return 1;
            if (parsed.compareTo(BigInteger.valueOf(maximum)) > 0) return maximum;
            return parsed.intValue();
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private record Page(int number, int limit) {
    }
}
