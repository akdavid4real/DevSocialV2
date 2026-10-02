package com.devsocial.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AuthControllerTest.FakeAuthConfiguration.class)
class AuthControllerTest {

    private static final UUID SUPABASE_USER_ID = UUID.fromString("24ab646b-8b7a-4b83-939d-f327dd4d1c5f");
    private static final UUID LOCAL_USER_ID = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID SESSION_ID = UUID.fromString("f18f6d09-c48a-46aa-9813-8695c709bc43");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsTheCurrentUserWithTheExistingEnvelope() throws Exception {
        mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(LOCAL_USER_ID.toString()))
                .andExpect(jsonPath("$.data.email").value("spring@devsocial.test"))
                .andExpect(jsonPath("$.data.username").value("springdev"))
                .andExpect(jsonPath("$.data.techStack[0]").value("Java"));
    }

    @Test
    void returnsTheExistingUnauthorizedEnvelopeWhenTokenIsMissing() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.path").value("/auth/me"))
                .andExpect(jsonPath("$.error").value("Missing access token"));
    }

    @Test
    void webLoginKeepsTheRefreshTokenInAnHttpOnlyCookie() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"springdev\",\"password\":\"secret1\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("devsocial_refresh=refresh-token"),
                                org.hamcrest.Matchers.containsString("HttpOnly"),
                                org.hamcrest.Matchers.containsString("Path=/api/v2/auth")
                        )))
                .andExpect(jsonPath("$.data.session.access_token").value("access-token"))
                .andExpect(jsonPath("$.data.session.refresh_token").doesNotExist());
    }

    @Test
    void mobileLoginReturnsTheRefreshTokenWithoutSettingACookie() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .header("x-client-platform", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"spring@devsocial.test\",\"password\":\"secret1\"}"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.data.session.refresh_token").value("refresh-token"));
    }

    @Test
    void webRefreshReadsAndRotatesTheCookie() throws Exception {
        mockMvc.perform(post("/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("devsocial_refresh", "old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.containsString("devsocial_refresh=refresh-token")))
                .andExpect(jsonPath("$.data.session.access_token").value("access-token"))
                .andExpect(jsonPath("$.data.session.refresh_token").doesNotExist());
    }

    @Test
    void verifiesSignupOtpUsingTheExistingContract() throws Exception {
        mockMvc.perform(post("/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"spring@devsocial.test\",\"token\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Email verified successfully"));
    }

    @Test
    void returnsGenericForgotPasswordResponse() throws Exception {
        mockMvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown@devsocial.test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.message").value(
                        "If an account with that email exists, we've sent a password reset link."
                ));
    }

    @Test
    void returnsCurrentSessionMetadata() throws Exception {
        mockMvc.perform(get("/auth/sessions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessions[0].id").value(SESSION_ID.toString()))
                .andExpect(jsonPath("$.data.sessions[0].isCurrent").value(true))
                .andExpect(jsonPath("$.data.supportsIndividualSessionListing").value(false));
    }

    @Test
    void logoutRevokesTheSessionAndClearsTheCookie() throws Exception {
        mockMvc.perform(post("/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("devsocial_refresh="),
                                org.hamcrest.Matchers.containsString("Max-Age=0")
                        )))
                .andExpect(jsonPath("$.data.message").value("Logged out successfully"));
    }

    @Test
    void rejectsRevokingAnotherSession() throws Exception {
        mockMvc.perform(delete("/auth/sessions/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Only the current session can be revoked individually"));
    }

    @Test
    void registersWithTheExistingUserResponseShape() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "NewUser@DevSocial.test",
                                  "password": "secret1",
                                  "username": "new_dev",
                                  "firstName": "New",
                                  "lastName": "Developer"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(LOCAL_USER_ID.toString()))
                .andExpect(jsonPath("$.data.email").value("newuser@devsocial.test"))
                .andExpect(jsonPath("$.data.username").value("new_dev"));
    }

    private static String accessToken() {
        String payload = "{\"session_id\":\"" + SESSION_ID + "\"}";
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "header." + encodedPayload + ".signature";
    }

    @TestConfiguration
    static class FakeAuthConfiguration {

        @Bean
        @Primary
        SupabaseIdentityProvider fakeIdentityProvider() {
            return accessToken -> SUPABASE_USER_ID;
        }

        @Bean
        @Primary
        AuthAccountRepository fakeAuthAccounts() {
            return new AuthAccountRepository() {
                @Override
                public boolean isSessionActive(UUID sessionId, UUID supabaseUserId) {
                    return SESSION_ID.equals(sessionId) && SUPABASE_USER_ID.equals(supabaseUserId);
                }

                @Override
                public Optional<AuthAccount> findBySupabaseUserId(UUID supabaseUserId) {
                    return Optional.of(new AuthAccount(LOCAL_USER_ID, false));
                }
            };
        }

        @Bean
        @Primary
        CurrentUserRepository fakeCurrentUsers() {
            CurrentUser user = new CurrentUser(
                    LOCAL_USER_ID,
                    "spring@devsocial.test",
                    "springdev",
                    "Spring",
                    "Developer",
                    "Spring Developer",
                    "",
                    "",
                    "",
                    "USER",
                    "Other",
                    "Backend",
                    List.of("Java", "Spring Boot"),
                    "BEGINNER",
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of("backend"),
                    10,
                    1,
                    List.of(),
                    0,
                    null,
                    0,
                    0,
                    true,
                    false,
                    Instant.parse("2026-09-30T12:00:00Z"),
                    Instant.parse("2026-09-30T12:00:00Z")
            );
            return userId -> LOCAL_USER_ID.equals(userId) ? Optional.of(user) : Optional.empty();
        }

        @Bean
        @Primary
        SupabaseSessionGateway fakeSupabaseSessions() {
            return new SupabaseSessionGateway() {
                @Override
                public SupabaseSession signIn(String email, String password) {
                    return session();
                }

                @Override
                public SupabaseSession refresh(String refreshToken) {
                    return session();
                }
            };
        }

        @Bean
        @Primary
        SupabaseRegistrationGateway fakeSupabaseRegistration() {
            return (email, password, metadata) -> SUPABASE_USER_ID;
        }

        @Bean
        @Primary
        RegistrationRepository fakeRegistrationRepository() {
            return new RegistrationRepository() {
                @Override
                public Optional<UUID> findReferrer(String referralCode) {
                    return Optional.of(UUID.randomUUID());
                }

                @Override
                public Map<String, Object> createUser(RegistrationProfile profile) {
                    return Map.of(
                            "id", LOCAL_USER_ID,
                            "email", profile.email(),
                            "username", profile.username()
                    );
                }

                @Override
                public void completeReferral(String referralCode, UUID referrerId, UUID referredId) {
                }
            };
        }

        @Bean
        @Primary
        SupabaseAccountGateway fakeSupabaseAccounts() {
            return new SupabaseAccountGateway() {
                @Override
                public UUID verifySignupOtp(String email, String token) {
                    return SUPABASE_USER_ID;
                }

                @Override
                public void sendPasswordReset(String email, String redirectUrl) {
                }

                @Override
                public void updatePassword(UUID supabaseUserId, String newPassword) {
                }

                @Override
                public void deleteUser(UUID supabaseUserId) {
                }

                @Override
                public void confirmEmail(UUID supabaseUserId) {
                }

                @Override
                public void signOut(String accessToken, SignOutScope scope) {
                }
            };
        }

        @Bean
        @Primary
        AccountManagementRepository fakeAccountManagementRepository() {
            return new AccountManagementRepository() {
                @Override
                public boolean emailExists(String email) {
                    return false;
                }

                @Override
                public void markVerified(UUID supabaseUserId) {
                }

                @Override
                public Optional<AccountCredentials> findCredentials(UUID userId) {
                    return Optional.of(new AccountCredentials(
                            SUPABASE_USER_ID, "spring@devsocial.test"
                    ));
                }

                @Override
                public void deleteUser(UUID userId) {
                }
            };
        }

        @Bean
        @Primary
        SessionUserRepository fakeSessionUsers() {
            Map<String, Object> profile = Map.of(
                    "id", LOCAL_USER_ID,
                    "email", "spring@devsocial.test",
                    "username", "springdev"
            );
            return new SessionUserRepository() {
                @Override
                public Optional<String> findEmailByUsername(String username) {
                    return Optional.of("spring@devsocial.test");
                }

                @Override
                public Optional<SessionUser> findBySupabaseUserId(UUID supabaseUserId) {
                    return Optional.of(new SessionUser(LOCAL_USER_ID, false, profile));
                }

                @Override
                public void recordLogin(UUID userId) {
                }

                @Override
                public void recordActivity(UUID userId) {
                }
            };
        }

        private static SupabaseSession session() {
            return new SupabaseSession(SUPABASE_USER_ID, "access-token", "refresh-token", 1_800_000_000L);
        }
    }
}
