package com.devsocial.backend.projects;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonIgnoreProperties(ignoreUnknown = false)
public record UpdateProjectStatusRequest(
        @NotBlank @Pattern(regexp = "PLANNING|IN_PROGRESS|COMPLETED|ON_HOLD") String status
) {
}
