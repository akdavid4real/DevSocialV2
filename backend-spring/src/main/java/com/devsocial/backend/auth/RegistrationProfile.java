package com.devsocial.backend.auth;

import java.util.UUID;

public record RegistrationProfile(
        UUID supabaseUserId,
        String email,
        String username,
        String firstName,
        String lastName,
        Integer birthMonth,
        Integer birthDay,
        String affiliation
) {
    public String displayName() {
        return (firstName + " " + lastName).trim();
    }
}
