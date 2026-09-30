package com.devsocial.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 6, message = "Verification code must be exactly 6 digits") String token
) {
}
