package com.devsocial.backend.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

record UpdateAdminUserRoleRequest(
        @NotNull @Pattern(regexp = "USER|MODERATOR|ADMIN|ANALYTICS") String role
) { }
