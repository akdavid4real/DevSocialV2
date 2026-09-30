package com.devsocial.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;

@Component
public class AuthCookieFactory {
    public static final String REFRESH_COOKIE = "devsocial_refresh";
    private final String nodeEnvironment;
    private final String sameSite;
    private final String domain;

    public AuthCookieFactory(
            @Value("${NODE_ENV:development}") String nodeEnvironment,
            @Value("${AUTH_COOKIE_SAME_SITE:lax}") String configuredSameSite,
            @Value("${AUTH_COOKIE_DOMAIN:}") String domain
    ) {
        this.nodeEnvironment = nodeEnvironment;
        String normalized = configuredSameSite.toLowerCase(Locale.ROOT);
        this.sameSite = normalized.equals("none") || normalized.equals("strict") ? normalized : "lax";
        this.domain = domain;
    }

    public ResponseCookie create(String refreshToken) {
        return baseCookie(refreshToken).maxAge(Duration.ofDays(30)).build();
    }

    public ResponseCookie clear() {
        return baseCookie("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(nodeEnvironment.equals("production") || sameSite.equals("none"))
                .sameSite(sameSite).path("/api/v2/auth");
        if (!domain.isBlank()) {
            builder.domain(domain);
        }
        return builder;
    }
}
