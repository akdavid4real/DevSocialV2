package com.devsocial.backend.projects;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateProjectRequest(
        @NotBlank @Size(min = 3, max = 100) String title,
        @NotBlank @Size(min = 20) String description,
        List<String> technologies,
        @URL String githubUrl,
        @URL String liveUrl,
        List<String> images,
        Object openPositions,
        @Pattern(regexp = "PLANNING|IN_PROGRESS|COMPLETED|ON_HOLD") String status,
        @Pattern(regexp = "PUBLIC|PRIVATE") String visibility
) {
}
