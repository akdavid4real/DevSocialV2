package com.devsocial.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Component
public class AccountManagement {
    private static final MessageResponse FORGOT_PASSWORD_RESPONSE = MessageResponse.of(
            "If an account with that email exists, we've sent a password reset link."
    );

    private final SupabaseAccountGateway supabaseAccounts;
    private final SupabaseSessionGateway supabaseSessions;
    private final AccountManagementRepository accounts;
    private final JwtSessionIdExtractor jwtClaims;
    private final String frontendUrl;

    public AccountManagement(
            SupabaseAccountGateway supabaseAccounts,
            SupabaseSessionGateway supabaseSessions,
            AccountManagementRepository accounts,
            JwtSessionIdExtractor jwtClaims,
            @Value("${FRONTEND_URL:http://localhost:5173}") String frontendUrl
    ) {
        this.supabaseAccounts = supabaseAccounts;
        this.supabaseSessions = supabaseSessions;
        this.accounts = accounts;
        this.jwtClaims = jwtClaims;
        this.frontendUrl = frontendUrl;
    }

    public MessageResponse verify(VerifyRequest request) {
        try {
            var supabaseUserId = supabaseAccounts.verifySignupOtp(
                    request.email().trim().toLowerCase(Locale.ROOT), request.token()
            );
            accounts.markVerified(supabaseUserId);
            return MessageResponse.of("Email verified successfully");
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message(exception, "Verification failed"));
        }
    }

    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (!accounts.emailExists(email)) {
            return FORGOT_PASSWORD_RESPONSE;
        }
        try {
            supabaseAccounts.sendPasswordReset(email, frontendUrl + "/auth/reset-password");
            return FORGOT_PASSWORD_RESPONSE;
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process password reset request"
            );
        }
    }

    public MessageResponse changePassword(AuthenticatedUser principal, ChangePasswordRequest request) {
        AccountCredentials credentials = credentials(principal);
        try {
            supabaseSessions.signIn(credentials.email(), request.currentPassword());
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }
        try {
            supabaseAccounts.updatePassword(credentials.supabaseUserId(), request.newPassword());
            return MessageResponse.of("Password changed successfully");
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update password");
        }
    }

    public MessageResponse deleteAccount(AuthenticatedUser principal) {
        AccountCredentials credentials = credentials(principal);
        try {
            supabaseAccounts.deleteUser(credentials.supabaseUserId());
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete account from auth"
            );
        }
        accounts.deleteUser(principal.userId());
        return MessageResponse.of("Account deleted successfully");
    }

    public SessionList sessions(AuthenticatedUser principal) {
        Instant now = Instant.now();
        return new SessionList(
                List.of(new SessionList.Session(
                        principal.sessionId().toString(),
                        now,
                        jwtClaims.expiresAt(principal.accessToken()).orElse(null),
                        true
                )),
                false
        );
    }

    public MessageResponse logout(AuthenticatedUser principal) {
        signOut(principal, SupabaseAccountGateway.SignOutScope.LOCAL, "Failed to revoke current session");
        return MessageResponse.of("Logged out successfully");
    }

    public MessageResponse logoutSession(AuthenticatedUser principal, String requestedSessionId) {
        if (!principal.sessionId().toString().equals(requestedSessionId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Only the current session can be revoked individually"
            );
        }
        signOut(principal, SupabaseAccountGateway.SignOutScope.LOCAL, "Failed to revoke session");
        return MessageResponse.of("Current session revoked successfully");
    }

    public MessageResponse logoutAll(AuthenticatedUser principal) {
        signOut(principal, SupabaseAccountGateway.SignOutScope.GLOBAL, "Failed to revoke sessions");
        return MessageResponse.of("Logged out from all devices");
    }

    private AccountCredentials credentials(AuthenticatedUser principal) {
        return accounts.findCredentials(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private void signOut(
            AuthenticatedUser principal,
            SupabaseAccountGateway.SignOutScope scope,
            String failureMessage
    ) {
        try {
            supabaseAccounts.signOut(principal.accessToken(), scope);
        } catch (SupabaseAuthException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, failureMessage);
        }
    }

    private static String message(SupabaseAuthException exception, String fallback) {
        return exception.getMessage() == null || exception.getMessage().isBlank()
                ? fallback
                : exception.getMessage();
    }
}
