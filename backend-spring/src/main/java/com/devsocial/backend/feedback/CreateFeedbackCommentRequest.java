package com.devsocial.backend.feedback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateFeedbackCommentRequest(
        @NotBlank @Size(max = 1000) String content
) {
}
