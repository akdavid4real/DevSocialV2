package com.devsocial.backend.auth;

import java.util.UUID;

public record AuthenticatedUser(
        UUID userId,
        UUID supabaseUserId,
        UUID sessionId,
        String accessToken
) {
}

