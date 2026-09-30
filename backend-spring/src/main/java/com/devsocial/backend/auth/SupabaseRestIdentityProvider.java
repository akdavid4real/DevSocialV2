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
public class SupabaseRestIdentityProvider
        implements SupabaseIdentityProvider, SupabaseSessionGateway, SupabaseAccountGateway,
        SupabaseRegistrationGateway {

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

    @Override
    public UUID signUp(String email, String password, Map<String, Object> metadata) {
        requireConfiguration();
        try {
            SignupResponse response = restClient.post()
                    .uri(supabaseUrl + "/auth/v1/signup")
                    .header("apikey", serviceRoleKey)
                    .body(Map.of("email", email, "password", password, "data", metadata))
                    .retrieve()
                    .body(SignupResponse.class);
            if (response == null || response.user() == null || response.user().id() == null) {
                throw new SupabaseAuthException("Failed to create auth user");
            }
            return response.user().id();
        } catch (SupabaseAuthException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw new SupabaseAuthException(errorMessage(exception), exception);
        } catch (RestClientException exception) {
            throw new SupabaseAuthException("Failed to create auth user", exception);
        }
    }

    @Override
    public UUID verifySignupOtp(String email, String token) {
        requireConfiguration();
        try {
            VerifyResponse response = restClient.post()
                    .uri(supabaseUrl + "/auth/v1/verify")
                    .header("apikey", serviceRoleKey)
                    .body(Map.of("email", email, "token", token, "type", "signup"))
                    .retrieve()
                    .body(VerifyResponse.class);
            if (response == null || response.user() == null || response.user().id() == null) {
                throw new SupabaseAuthException("Verification failed");
            }
            return response.user().id();
        } catch (SupabaseAuthException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw new SupabaseAuthException(errorMessage(exception), exception);
        } catch (RestClientException exception) {
            throw new SupabaseAuthException("Verification failed", exception);
        }
    }

    @Override
    public void sendPasswordReset(String email, String redirectUrl) {
        requireConfiguration();
        String uri = org.springframework.web.util.UriComponentsBuilder
                .fromUriString(supabaseUrl + "/auth/v1/recover")
                .queryParam("redirect_to", redirectUrl)
                .build().encode().toUriString();
        execute(() -> restClient.post().uri(uri)
                .header("apikey", serviceRoleKey)
                .body(Map.of("email", email))
                .retrieve().toBodilessEntity());
    }

    @Override
    public void updatePassword(UUID supabaseUserId, String newPassword) {
        requireConfiguration();
        execute(() -> restClient.put()
                .uri(supabaseUrl + "/auth/v1/admin/users/" + supabaseUserId)
                .header("apikey", serviceRoleKey)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .body(Map.of("password", newPassword))
                .retrieve().toBodilessEntity());
    }

    @Override
    public void deleteUser(UUID supabaseUserId) {
        requireConfiguration();
        execute(() -> restClient.delete()
                .uri(supabaseUrl + "/auth/v1/admin/users/" + supabaseUserId)
                .header("apikey", serviceRoleKey)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .retrieve().toBodilessEntity());
    }

    @Override
    public void signOut(String accessToken, SignOutScope scope) {
        requireConfiguration();
        execute(() -> restClient.post()
                .uri(supabaseUrl + "/auth/v1/logout?scope=" + scope.queryValue())
                .header("apikey", serviceRoleKey)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve().toBodilessEntity());
    }

    private void execute(Runnable request) {
        try {
            request.run();
        } catch (RestClientResponseException exception) {
            throw new SupabaseAuthException(errorMessage(exception), exception);
        } catch (RestClientException exception) {
            throw new SupabaseAuthException("Supabase account request failed", exception);
        }
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

    private record VerifyResponse(SupabaseUser user) {
    }

    private record SignupResponse(SupabaseUser user) {
    }
}
