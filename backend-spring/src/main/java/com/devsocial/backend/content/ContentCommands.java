package com.devsocial.backend.content;

import java.util.Map;
import java.util.UUID;

/** Transactional content-command seam. */
public interface ContentCommands {
    Map<String, Object> createPost(UUID actorId, CreatePostRequest request);
    Map<String, Object> deletePost(UUID actorId, UUID postId);
    Map<String, Object> togglePostLike(UUID actorId, UUID postId);
    Map<String, Object> addComment(UUID actorId, UUID postId, CreateCommentRequest request);
    Map<String, Object> deleteComment(UUID actorId, UUID commentId);
    Map<String, Object> toggleCommentLike(UUID actorId, UUID commentId);
    Map<String, Object> vote(UUID actorId, UUID postId, PollVoteRequest request);
}
