package com.devsocial.backend.feedback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonIgnoreProperties(ignoreUnknown = false)
public record UpdateFeedbackStatusRequest(
        @NotBlank @Pattern(regexp = "OPEN|IN_PROGRESS|SOLVED") String status
) {
}
