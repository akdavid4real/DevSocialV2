package com.devsocial.backend.challenges;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = false)
public record SubmitChallengeProgressRequest(
        @NotNull @Min(0) @Max(100) Integer progress,
        Map<String, Object> submissionData
) {
}
