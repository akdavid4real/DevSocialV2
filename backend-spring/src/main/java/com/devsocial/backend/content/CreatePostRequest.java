package com.devsocial.backend.content;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreatePostRequest(
        String content,
        List<String> imageUrls,
        List<String> videoUrls,
        Boolean isAnonymous,
        Object poll,
        UUID communityId,
        List<String> tags,
        List<String> mentions
) {
}
