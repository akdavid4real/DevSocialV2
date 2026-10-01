package com.devsocial.backend.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record AdminResetPasswordRequest(@NotBlank @Size(min = 8) String newPassword) { }
