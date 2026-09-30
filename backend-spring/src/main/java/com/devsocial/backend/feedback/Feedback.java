package com.devsocial.backend.feedback;

import java.util.Map;
import java.util.UUID;

/** Role-aware feedback workflow seam for owners and moderation staff. */
public interface Feedback {
    Map<String, Object> findAll(UUID actorId, boolean requestAll, int page, int limit,
                                String search, String status, String type);
    Map<String, Object> create(UUID actorId, CreateFeedbackRequest request);
    Map<String, Object> findOne(UUID actorId, UUID feedbackId);
    Map<String, Object> comment(UUID actorId, UUID feedbackId, CreateFeedbackCommentRequest request);
    Map<String, Object> updateStatus(UUID actorId, UUID feedbackId, String status);
}
