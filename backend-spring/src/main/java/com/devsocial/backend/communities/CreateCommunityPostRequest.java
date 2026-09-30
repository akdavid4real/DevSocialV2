package com.devsocial.backend.communities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateCommunityPostRequest(
        @NotBlank @Size(max = 5000) String content
) {
}
