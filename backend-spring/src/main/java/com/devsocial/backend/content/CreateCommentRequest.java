package com.devsocial.backend.content;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateCommentRequest(
        @NotNull(message = "content must be a string")
        @Size(max = 500, message = "Comment cannot exceed 500 characters")
        String content,
        UUID parentId,
        List<String> imageUrls,
        List<String> videoUrls
) {
}
