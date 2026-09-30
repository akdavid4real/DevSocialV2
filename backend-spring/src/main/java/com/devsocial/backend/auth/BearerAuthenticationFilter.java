package com.devsocial.backend.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class BearerAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final AccessTokenAuthenticator authenticator;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public BearerAuthenticationFilter(
            AccessTokenAuthenticator authenticator,
            AuthenticationEntryPoint authenticationEntryPoint
    ) {
        this.authenticator = authenticator;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith(PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring(PREFIX.length()).trim();
        if (token.isBlank()) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new InvalidAccessTokenException("Missing access token")
            );
            return;
        }

        try {
            AuthenticatedUser principal = authenticator.authenticate(token);
            var authentication = new UsernamePasswordAuthenticationToken(principal, token, List.of());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (InvalidAccessTokenException exception) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(request, response, exception);
        }
    }
}

