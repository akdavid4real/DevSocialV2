package com.devsocial.backend.auth;

import java.util.UUID;

public interface SupabaseAccountGateway {
    UUID verifySignupOtp(String email, String token);
    void sendPasswordReset(String email, String redirectUrl);
    void updatePassword(UUID supabaseUserId, String newPassword);
    void deleteUser(UUID supabaseUserId);
    void signOut(String accessToken, SignOutScope scope);

    // No outbound email/domain is configured for this deployment, so Supabase's
    // signup confirmation email cannot reach new users. Registration marks the
    // account confirmed immediately instead of sending a code. To restore normal
    // email verification, remove the confirmEmail call in Registration.register()
    // and the implementation below.
    void confirmEmail(UUID supabaseUserId);

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
