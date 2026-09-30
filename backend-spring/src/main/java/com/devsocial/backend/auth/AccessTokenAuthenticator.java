package com.devsocial.backend.auth;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class AccessTokenAuthenticator {

    private final SupabaseIdentityProvider identityProvider;
    private final JwtSessionIdExtractor sessionIdExtractor;
    private final AuthAccountRepository accounts;

    public AccessTokenAuthenticator(
            SupabaseIdentityProvider identityProvider,
            JwtSessionIdExtractor sessionIdExtractor,
            AuthAccountRepository accounts
    ) {
        this.identityProvider = identityProvider;
        this.sessionIdExtractor = sessionIdExtractor;
        this.accounts = accounts;
    }

    public AuthenticatedUser authenticate(String accessToken) {
        UUID supabaseUserId = identityProvider.verifyAccessToken(accessToken);
        UUID sessionId = sessionIdExtractor.extract(accessToken)
                .orElseThrow(() -> new InvalidAccessTokenException(
                        "Access token is not bound to a Supabase session"
                ));

        if (!accounts.isSessionActive(sessionId, supabaseUserId)) {
            throw new InvalidAccessTokenException("Session has been revoked");
        }

        AuthAccount account = accounts.findBySupabaseUserId(supabaseUserId)
                .orElseThrow(() -> new InvalidAccessTokenException("User profile not found"));
        if (account.blocked()) {
            throw new InvalidAccessTokenException("User is blocked");
        }

        return new AuthenticatedUser(account.id(), supabaseUserId, sessionId, accessToken);
    }
}

