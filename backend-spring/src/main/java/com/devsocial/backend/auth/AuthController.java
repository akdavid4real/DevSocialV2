package com.devsocial.backend.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    public AuthController(
            CurrentUserQuery currentUserQuery,
            SessionAuthentication sessionAuthentication,
            AuthCookieFactory cookies
    ) {
        this.currentUserQuery = currentUserQuery;
        this.sessionAuthentication = sessionAuthentication;
        this.cookies = cookies;
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

    @GetMapping("/me")
    CurrentUser me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return currentUserQuery.get(principal);
    }

    private static boolean isMobile(String clientPlatform) {
        return clientPlatform != null && clientPlatform.equalsIgnoreCase("mobile");
    }
}
