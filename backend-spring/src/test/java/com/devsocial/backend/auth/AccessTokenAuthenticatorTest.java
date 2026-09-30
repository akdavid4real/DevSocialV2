package com.devsocial.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccessTokenAuthenticatorTest {

    private final UUID supabaseUserId = UUID.randomUUID();
    private final UUID localUserId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();

    @Test
    void authenticatesOnlyWhenSupabaseSessionAndLocalAccountAgree() {
        AccessTokenAuthenticator authenticator = authenticator(true, false);
        String token = tokenWithSession(sessionId);

        AuthenticatedUser principal = authenticator.authenticate(token);

        assertThat(principal.userId()).isEqualTo(localUserId);
        assertThat(principal.supabaseUserId()).isEqualTo(supabaseUserId);
        assertThat(principal.sessionId()).isEqualTo(sessionId);
        assertThat(principal.accessToken()).isEqualTo(token);
    }

    @Test
    void rejectsTokensWithoutASupabaseSessionId() {
        AccessTokenAuthenticator authenticator = authenticator(true, false);

        assertThatThrownBy(() -> authenticator.authenticate(tokenWithPayload("{}")))
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Access token is not bound to a Supabase session");
    }

    @Test
    void rejectsRevokedSessions() {
        AccessTokenAuthenticator authenticator = authenticator(false, false);

        assertThatThrownBy(() -> authenticator.authenticate(tokenWithSession(sessionId)))
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Session has been revoked");
    }

    @Test
    void rejectsBlockedLocalAccounts() {
        AccessTokenAuthenticator authenticator = authenticator(true, true);

        assertThatThrownBy(() -> authenticator.authenticate(tokenWithSession(sessionId)))
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("User is blocked");
    }

    private AccessTokenAuthenticator authenticator(boolean activeSession, boolean blocked) {
        SupabaseIdentityProvider identityProvider = accessToken -> supabaseUserId;
        AuthAccountRepository accounts = new AuthAccountRepository() {
            @Override
            public boolean isSessionActive(UUID requestedSessionId, UUID requestedSupabaseUserId) {
                return activeSession
                        && requestedSessionId.equals(sessionId)
                        && requestedSupabaseUserId.equals(supabaseUserId);
            }

            @Override
            public Optional<AuthAccount> findBySupabaseUserId(UUID requestedSupabaseUserId) {
                return Optional.of(new AuthAccount(localUserId, blocked));
            }
        };
        return new AccessTokenAuthenticator(
                identityProvider,
                new JwtSessionIdExtractor(new ObjectMapper()),
                accounts
        );
    }

    private static String tokenWithSession(UUID sessionId) {
        return tokenWithPayload("{\"session_id\":\"" + sessionId + "\"}");
    }

    private static String tokenWithPayload(String payload) {
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "header." + encodedPayload + ".signature";
    }
}

