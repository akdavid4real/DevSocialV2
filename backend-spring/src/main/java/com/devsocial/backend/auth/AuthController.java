package com.devsocial.backend.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final CurrentUserQuery currentUserQuery;
    private final SessionAuthentication sessionAuthentication;
    private final AuthCookieFactory cookies;
    private final AccountManagement accountManagement;

    public AuthController(
            CurrentUserQuery currentUserQuery,
            SessionAuthentication sessionAuthentication,
            AuthCookieFactory cookies,
            AccountManagement accountManagement
    ) {
        this.currentUserQuery = currentUserQuery;
        this.sessionAuthentication = sessionAuthentication;
        this.cookies = cookies;
        this.accountManagement = accountManagement;
    }

    @PostMapping("/login")
    ResponseEntity<PublicSession> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "x-client-platform", required = false) String clientPlatform
    ) {
        boolean mobile = isMobile(clientPlatform);
        SessionAuthentication.SessionResult result = sessionAuthentication.login(request);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (!mobile) {
            response.header(HttpHeaders.SET_COOKIE, cookies.create(result.session().refreshToken()).toString());
        }
        return response.body(sessionAuthentication.toPublicSession(result, mobile));
    }

    @PostMapping("/refresh")
    ResponseEntity<PublicSession> refresh(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(value = AuthCookieFactory.REFRESH_COOKIE, required = false) String cookieRefreshToken,
            @RequestHeader(value = "x-client-platform", required = false) String clientPlatform
    ) {
        boolean mobile = isMobile(clientPlatform);
        String refreshToken = mobile && request != null ? request.refreshToken() : cookieRefreshToken;
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh session");
        }
        SessionAuthentication.SessionResult result = sessionAuthentication.refresh(refreshToken);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (!mobile) {
            response.header(HttpHeaders.SET_COOKIE, cookies.create(result.session().refreshToken()).toString());
        }
        return response.body(sessionAuthentication.toPublicSession(result, mobile));
    }

    @PostMapping("/verify")
    MessageResponse verify(@Valid @RequestBody VerifyRequest request) {
        return accountManagement.verify(request);
    }

    @PostMapping("/forgot-password")
    MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return accountManagement.forgotPassword(request);
    }

    @GetMapping("/me")
    CurrentUser me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return currentUserQuery.get(principal);
    }

    @PostMapping("/change-password")
    MessageResponse changePassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        return accountManagement.changePassword(principal, request);
    }

    @DeleteMapping("/delete-account")
    ResponseEntity<MessageResponse> deleteAccount(@AuthenticationPrincipal AuthenticatedUser principal) {
        return withClearedCookie(accountManagement.deleteAccount(principal));
    }

    @PostMapping("/logout")
    ResponseEntity<MessageResponse> logout(@AuthenticationPrincipal AuthenticatedUser principal) {
        return withClearedCookie(accountManagement.logout(principal));
    }

    @GetMapping("/sessions")
    SessionList sessions(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accountManagement.sessions(principal);
    }

    @DeleteMapping("/sessions/{sessionId}")
    ResponseEntity<MessageResponse> logoutSession(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable String sessionId
    ) {
        return withClearedCookie(accountManagement.logoutSession(principal, sessionId));
    }

    @PostMapping("/logout-all")
    ResponseEntity<MessageResponse> logoutAll(@AuthenticationPrincipal AuthenticatedUser principal) {
        return withClearedCookie(accountManagement.logoutAll(principal));
    }

    private ResponseEntity<MessageResponse> withClearedCookie(MessageResponse body) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
                .body(body);
    }

    private static boolean isMobile(String clientPlatform) {
        return clientPlatform != null && clientPlatform.equalsIgnoreCase("mobile");
    }
}
