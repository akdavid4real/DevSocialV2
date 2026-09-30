package com.devsocial.backend.auth;

import java.util.UUID;

public interface SupabaseAccountGateway {
    UUID verifySignupOtp(String email, String token);
    void sendPasswordReset(String email, String redirectUrl);
    void updatePassword(UUID supabaseUserId, String newPassword);
    void deleteUser(UUID supabaseUserId);
    void signOut(String accessToken, SignOutScope scope);

    enum SignOutScope {
        LOCAL("local"),
        GLOBAL("global");

        private final String queryValue;

        SignOutScope(String queryValue) {
            this.queryValue = queryValue;
        }

        public String queryValue() {
            return queryValue;
        }
    }
}
