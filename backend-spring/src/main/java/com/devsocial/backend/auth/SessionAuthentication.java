package com.devsocial.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Component
public class SessionAuthentication {
    private final SupabaseSessionGateway supabase;
    private final SessionUserRepository users;

    public SessionAuthentication(SupabaseSessionGateway supabase, SessionUserRepository users) {
        this.supabase = supabase;
        this.users = users;
    }

    public SessionResult login(LoginRequest request) {
        String login = request.usernameOrEmail().trim();
        String email = login.contains("@") ? login.toLowerCase(Locale.ROOT)
                : users.findEmailByUsername(login).orElseThrow(() -> unauthorized("Invalid credentials"));
        SupabaseSession session;
        try {
            session = supabase.signIn(email, request.password());
        } catch (SupabaseAuthException exception) {
            if (exception.getMessage() != null
                    && exception.getMessage().toLowerCase(Locale.ROOT).contains("email not confirmed")) {
                throw unauthorized("Please verify your email address before logging in.");
            }
            throw unauthorized("Invalid credentials");
        }
        SessionUser user = requireUser(session);
        users.recordLogin(user.id());
        return new SessionResult(user, session);
    }

    public SessionResult refresh(String refreshToken) {
        SupabaseSession session;
        try {
            session = supabase.refresh(refreshToken);
        } catch (SupabaseAuthException exception) {
            throw unauthorized("Refresh session is invalid or expired");
        }
        SessionUser user = requireUser(session);
        users.recordActivity(user.id());
        return new SessionResult(user, session);
    }

    public PublicSession toPublicSession(SessionResult result, boolean includeRefreshToken) {
        return new PublicSession(result.user().profile(), new PublicSession.Session(
                result.session().accessToken(), result.session().expiresAt(),
                includeRefreshToken ? result.session().refreshToken() : null
        ));
    }

    private SessionUser requireUser(SupabaseSession session) {
        SessionUser user = users.findBySupabaseUserId(session.supabaseUserId())
                .orElseThrow(() -> unauthorized("User profile not found"));
        if (user.blocked()) {
            throw unauthorized("User is blocked");
        }
        return user;
    }

    private static ResponseStatusException unauthorized(String message) {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, message);
    }

    public record SessionResult(SessionUser user, SupabaseSession session) {
    }
}
