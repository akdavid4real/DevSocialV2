package com.devsocial.backend.challenges;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateChallengeRequest(
        @NotBlank @Size(min = 3, max = 100) String title,
        @NotBlank @Size(min = 10, max = 500) String description,
        @NotNull @Pattern(regexp = "POST_CREATION|ENGAGEMENT|COMMUNITY|LEARNING|CREATIVE") String type,
        @NotNull @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty,
        @NotNull Map<String, Object> requirements,
        @NotNull Map<String, Object> rewards,
        @NotNull Instant startDate,
        @NotNull Instant endDate,
        @Min(0) @Max(500) Integer firstCompletionBonus,
        Boolean isActive
) {
}
