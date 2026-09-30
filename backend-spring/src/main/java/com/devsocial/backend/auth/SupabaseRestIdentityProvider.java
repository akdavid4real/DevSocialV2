package com.devsocial.backend.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;
import java.util.UUID;

@Component
public class SupabaseRestIdentityProvider implements SupabaseIdentityProvider, SupabaseSessionGateway {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String supabaseUrl;
    private final String serviceRoleKey;

    public SupabaseRestIdentityProvider(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${SUPABASE_URL:}") String supabaseUrl,
            @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String serviceRoleKey
    ) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
        this.supabaseUrl = stripTrailingSlash(supabaseUrl);
        this.serviceRoleKey = serviceRoleKey;
    }

    @Override
    public SupabaseSession signIn(String email, String password) {
        return tokenRequest("password", Map.of("email", email, "password", password));
    }

    @Override
    public SupabaseSession refresh(String refreshToken) {
        return tokenRequest("refresh_token", Map.of("refresh_token", refreshToken));
    }

    private SupabaseSession tokenRequest(String grantType, Map<String, String> body) {
        requireConfiguration();
        try {
            TokenResponse response = restClient.post()
                    .uri(supabaseUrl + "/auth/v1/token?grant_type=" + grantType)
                    .header("apikey", serviceRoleKey)
                    .body(body)
                    .retrieve()
                    .body(TokenResponse.class);
            if (response == null || response.user() == null || response.user().id() == null
                    || response.accessToken() == null || response.refreshToken() == null) {
                throw new SupabaseAuthException("Supabase returned an incomplete session");
            }
            return new SupabaseSession(
                    response.user().id(), response.accessToken(), response.refreshToken(), response.expiresAt()
            );
        } catch (SupabaseAuthException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw new SupabaseAuthException(errorMessage(exception), exception);
        } catch (RestClientException exception) {
            throw new SupabaseAuthException("Supabase authentication request failed", exception);
        }
    }

    private String errorMessage(RestClientResponseException exception) {
        try {
            JsonNode body = objectMapper.readTree(exception.getResponseBodyAsString());
            for (String key : new String[]{"msg", "message", "error_description", "error"}) {
                String value = body.path(key).asText(null);
                if (value != null && !value.isBlank()) {
                    return value;
                }
            }
        } catch (Exception ignored) {
            // Use a stable fallback for non-JSON upstream errors.
        }
        return "Supabase authentication request failed";
    }

    private void requireConfiguration() {
        if (supabaseUrl.isBlank() || serviceRoleKey.isBlank()) {
            throw new SupabaseAuthException("Supabase authentication is not configured");
        }
    }

    @Override
    public UUID verifyAccessToken(String accessToken) {
        if (supabaseUrl.isBlank() || serviceRoleKey.isBlank()) {
            throw new InvalidAccessTokenException("Supabase authentication is not configured");
        }

        try {
            SupabaseUser response = restClient.get()
                    .uri(supabaseUrl + "/auth/v1/user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("apikey", serviceRoleKey)
                    .retrieve()
                    .body(SupabaseUser.class);

            if (response == null || response.id() == null) {
                throw new InvalidAccessTokenException("Invalid or expired access token");
            }
            return response.id();
        } catch (InvalidAccessTokenException exception) {
            throw exception;
        } catch (RestClientException | IllegalArgumentException exception) {
            throw new InvalidAccessTokenException("Invalid or expired access token", exception);
        }
    }

    private static String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record SupabaseUser(UUID id) {
    }

    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_at") long expiresAt,
            SupabaseUser user
    ) {
    }
}
