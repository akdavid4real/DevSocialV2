package com.devsocial.backend.reports;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateReportRequest(
        @NotNull UUID postId,
        @NotNull @Pattern(regexp = "SPAM|HARASSMENT|INAPPROPRIATE|MISINFORMATION|COPYRIGHT|OTHER") String reason,
        @Size(max = 500) String description
) {
}
