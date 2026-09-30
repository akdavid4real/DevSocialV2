package com.devsocial.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(@NotBlank String usernameOrEmail, @NotBlank @Size(min = 6) String password) {
}
