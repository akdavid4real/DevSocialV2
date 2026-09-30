package com.devsocial.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String password,
        @NotBlank @Size(min = 3, max = 20)
        @Pattern(
                regexp = "^[a-zA-Z0-9_]+$",
                message = "Username can only contain letters, numbers and underscores"
        ) String username,
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        Integer birthMonth,
        Integer birthDay,
        String affiliation,
        String affiliationType,
        String referralCode,
        String confirmPassword
) {
}
