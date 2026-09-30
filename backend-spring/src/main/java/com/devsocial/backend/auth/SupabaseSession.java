package com.devsocial.backend.auth;

import java.util.UUID;

public record SupabaseSession(UUID supabaseUserId, String accessToken, String refreshToken, long expiresAt) {
}
