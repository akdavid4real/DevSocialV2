package com.devsocial.backend.admin;

import jakarta.validation.constraints.NotBlank;

record BanAdminUserRequest(@NotBlank String reason, Boolean permanent) { }
