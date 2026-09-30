package com.devsocial.backend.auth;

import java.util.UUID;

public interface SupabaseIdentityProvider {

    UUID verifyAccessToken(String accessToken);
}

