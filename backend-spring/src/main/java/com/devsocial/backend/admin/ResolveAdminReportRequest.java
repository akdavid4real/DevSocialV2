package com.devsocial.backend.admin;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@JsonIgnoreProperties(ignoreUnknown = false)
public record ResolveAdminReportRequest(
        @NotNull @Pattern(regexp = "PENDING|REVIEWED|RESOLVED|DISMISSED") String status,
        @Pattern(regexp = "NONE|WARNING|POST_REMOVED|USER_SUSPENDED|USER_BANNED") String action,
        String reviewNote
) {
}
