package com.devsocial.backend.users;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UsersController {
    private final UserProfiles profiles;

    public UsersController(UserProfiles profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/profile")
    Map<String, Object> profile(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profiles.current(principal);
    }

    @PatchMapping("/profile")
    Map<String, Object> updateProfile(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Object> request
    ) {
        return profiles.updateProfile(principal, request);
    }

    @GetMapping("/search")
    List<Map<String, Object>> search(@RequestParam(value = "q", required = false) String query) {
        return profiles.search(query);
    }

    @GetMapping("/leaderboard")
    Map<String, Object> leaderboard(
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "limit", required = false) String limit
    ) {
        return profiles.leaderboard(period, parseLimit(limit));
    }

    @GetMapping("/onboarding")
    Map<String, Object> onboarding(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profiles.onboarding(principal);
    }

    @PutMapping("/onboarding")
    Map<String, Object> updateOnboarding(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Object> request
    ) {
        return profiles.updateOnboarding(principal, request);
    }

    @PostMapping("/avatar/ready-player-me")
    Map<String, Object> saveReadyPlayerAvatar(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ReadyPlayerAvatarRequest request
    ) {
        return profiles.saveReadyPlayerAvatar(principal, request);
    }

    @GetMapping("/appearance-settings")
    Map<String, Object> appearance(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profiles.appearance(principal);
    }

    @PutMapping("/appearance-settings")
    Map<String, Object> updateAppearance(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Object> request
    ) {
        return profiles.updateAppearance(principal, request);
    }

    @GetMapping("/privacy")
    Map<String, Object> privacy(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profiles.privacy(principal);
    }

    @PatchMapping("/privacy")
    Map<String, Object> updatePrivacy(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Object> request
    ) {
        return profiles.updatePrivacy(principal, request);
    }

    @GetMapping("/notification-settings")
    Map<String, Object> notifications(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profiles.notifications(principal);
    }

    @PatchMapping("/notification-settings")
    Map<String, Object> updateNotifications(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody Map<String, Object> request
    ) {
        return profiles.updateNotifications(principal, request);
    }

    private Integer parseLimit(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
