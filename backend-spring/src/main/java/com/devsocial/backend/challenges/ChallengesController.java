package com.devsocial.backend.challenges;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/challenges")
public class ChallengesController {
    private final Challenges challenges;

    public ChallengesController(Challenges challenges) {
        this.challenges = challenges;
    }

    @GetMapping
    List<Map<String, Object>> active(@AuthenticationPrincipal AuthenticatedUser principal) {
        return challenges.findActive(principal == null ? null : principal.userId());
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateChallengeRequest request) {
        return challenges.create(principal.userId(), request);
    }

    @GetMapping("/user")
    List<Map<String, Object>> userChallenges(@AuthenticationPrincipal AuthenticatedUser principal) {
        return challenges.findUserChallenges(principal.userId());
    }

    @PostMapping("/{challengeId}/join")
    Map<String, Object> join(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID challengeId) {
        return challenges.join(principal.userId(), challengeId);
    }

    @PostMapping("/{challengeId}/submit")
    Map<String, Object> submit(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID challengeId, @Valid @RequestBody SubmitChallengeProgressRequest request) {
        return challenges.submit(principal.userId(), challengeId, request);
    }

    @GetMapping("/{challengeId}/leaderboard")
    List<Map<String, Object>> leaderboard(@PathVariable UUID challengeId) {
        return challenges.leaderboard(challengeId);
    }
}
