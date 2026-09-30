package com.devsocial.backend.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

record UpdateAdminPostStatusRequest(
        @NotNull @Pattern(regexp = "PENDING_REVIEW|ACTIVE|ARCHIVED|BLOCKED") String status,
        String reason
) { }
