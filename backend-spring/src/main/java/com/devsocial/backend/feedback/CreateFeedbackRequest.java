package com.devsocial.backend.feedback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateFeedbackRequest(
        @NotBlank @Pattern(regexp = "BUG|FEATURE|GENERAL|IMPROVEMENT") String type,
        @NotBlank @Size(min = 3, max = 200) String subject,
        @NotBlank @Size(min = 10) String description,
        @Min(1) @Max(5) Integer rating
) {
}
