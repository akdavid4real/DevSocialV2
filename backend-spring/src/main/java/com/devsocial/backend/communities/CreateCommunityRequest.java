package com.devsocial.backend.communities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateCommunityRequest(
        @NotBlank @Size(min = 3, max = 50) String name,
        @NotBlank @Size(min = 10, max = 500) String description,
        @NotBlank @Pattern(regexp = "FRONTEND|BACKEND|MOBILE|DEVOPS|DATA|AI|BLOCKCHAIN|GENERAL") String category,
        List<String> tags,
        List<String> rules,
        Boolean isPrivate
) {
}
