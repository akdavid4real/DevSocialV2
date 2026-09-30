package com.devsocial.backend.feedback;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/feedback")
public class FeedbackController {
    private final Feedback feedback;

    public FeedbackController(Feedback feedback) {
        this.feedback = feedback;
    }

    @GetMapping
    Map<String, Object> findAll(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false, name = "view") String view
    ) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safeLimit = limit == null || limit < 1 ? 20 : Math.min(limit, 50);
        return feedback.findAll(principal.userId(), "all".equals(view), safePage, safeLimit, search, status, type);
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody CreateFeedbackRequest request) {
        return feedback.create(principal.userId(), request);
    }

    @GetMapping("/{id}")
    Map<String, Object> findOne(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id) {
        return feedback.findOne(principal.userId(), id);
    }

    @PostMapping("/{id}/comments")
    Map<String, Object> comment(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id,
                                @Valid @RequestBody CreateFeedbackCommentRequest request) {
        return feedback.comment(principal.userId(), id, request);
    }

    @PatchMapping("/{id}/status")
    Map<String, Object> updateStatus(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id,
                                     @Valid @RequestBody UpdateFeedbackStatusRequest request) {
        return feedback.updateStatus(principal.userId(), id, request.status());
    }
}
