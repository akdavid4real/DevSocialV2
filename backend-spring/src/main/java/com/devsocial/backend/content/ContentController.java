package com.devsocial.backend.content;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
public class ContentController {
    private final ContentQueries content;

    public ContentController(ContentQueries content) {
        this.content = content;
    }

    @GetMapping("/posts")
    Object feed(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search
    ) {
        return content.feed(userId(principal), page(page), limit(limit, 10, 50), search);
    }

    @GetMapping("/posts/tag/{tagName}")
    Map<String, Object> tagged(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String tagName,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return content.tagged(userId(principal), tagName, page(page), limit(limit, 10, 50));
    }

    @GetMapping("/posts/{postId}")
    Map<String, Object> post(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId,
            HttpServletRequest request
    ) {
        return content.post(
                postId,
                userId(principal),
                request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr(),
                request.getHeader("user-agent")
        );
    }

    @GetMapping("/posts/{postId}/comments")
    Map<String, Object> comments(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return content.comments(postId, userId(principal), page(page), limit(limit, 20, 100));
    }

    @GetMapping("/posts/comments/{commentId}/replies")
    Map<String, Object> replies(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID commentId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        return content.replies(commentId, userId(principal), page(page), limit(limit, 10, 100));
    }

    @GetMapping("/users/{username}/posts")
    Object userPosts(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String username
    ) {
        return content.userPosts(username, userId(principal));
    }

    private Optional<UUID> userId(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : Optional.of(principal.userId());
    }

    private int page(Integer value) {
        return Math.max(value == null ? 1 : value, 1);
    }

    private int limit(Integer value, int defaultValue, int maximum) {
        return Math.min(Math.max(value == null ? defaultValue : value, 1), maximum);
    }
}
