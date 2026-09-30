package com.devsocial.backend.content;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class ContentCommandController {
    private final ContentCommands content;

    public ContentCommandController(ContentCommands content) {
        this.content = content;
    }

    @PostMapping("/posts")
    Map<String, Object> createPost(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody CreatePostRequest request
    ) {
        return content.createPost(principal.userId(), request);
    }

    @DeleteMapping("/posts/{postId}")
    Map<String, Object> deletePost(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId
    ) {
        return content.deletePost(principal.userId(), postId);
    }

    @PostMapping("/posts/{postId}/like")
    Map<String, Object> togglePostLike(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId
    ) {
        return content.togglePostLike(principal.userId(), postId);
    }

    @PostMapping("/posts/{postId}/comments")
    Map<String, Object> addComment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        return content.addComment(principal.userId(), postId, request);
    }

    @DeleteMapping("/posts/comments/{commentId}")
    Map<String, Object> deleteComment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID commentId
    ) {
        return content.deleteComment(principal.userId(), commentId);
    }

    @PostMapping("/posts/comments/{commentId}/like")
    Map<String, Object> toggleCommentLike(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID commentId
    ) {
        return content.toggleCommentLike(principal.userId(), commentId);
    }

    @PostMapping("/posts/{postId}/poll/vote")
    Map<String, Object> vote(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID postId,
            @RequestBody PollVoteRequest request
    ) {
        return content.vote(principal.userId(), postId, request);
    }
}
