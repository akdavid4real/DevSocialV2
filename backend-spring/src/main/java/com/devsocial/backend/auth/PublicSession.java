package com.devsocial.backend.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record PublicSession(Map<String, Object> user, Session session) {
    public record Session(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_at") long expiresAt,
            @JsonProperty("refresh_token") @JsonInclude(JsonInclude.Include.NON_NULL) String refreshToken
    ) {
    }
}
