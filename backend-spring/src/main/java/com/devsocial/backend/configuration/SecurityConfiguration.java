package com.devsocial.backend.configuration;

import com.devsocial.backend.auth.BearerAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            BearerAuthenticationFilter bearerAuthenticationFilter,
            JsonAuthenticationEntryPoint authenticationEntryPoint,
            JsonAccessDeniedHandler accessDeniedHandler
    ) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/", "/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers(
                                "/auth/register",
                                "/auth/login",
                                "/auth/refresh",
                                "/auth/verify",
                                "/auth/forgot-password"
                        ).permitAll()
                        .requestMatchers("/users/search", "/users/leaderboard").permitAll()
                        .requestMatchers(
                                "/auth/me",
                                "/auth/change-password",
                                "/auth/delete-account",
                                "/auth/logout",
                                "/auth/logout-all",
                                "/auth/sessions",
                                "/auth/sessions/**"
                        ).authenticated()
                        .requestMatchers(
                                "/users/profile",
                                "/users/onboarding",
                                "/users/avatar/ready-player-me",
                                "/users/appearance-settings",
                                "/users/privacy",
                                "/users/notification-settings"
                        ).authenticated()
                        .requestMatchers("/follow/**", "/users/blocked", "/users/block/**", "/users/unblock/**")
                        .authenticated()
                        .requestMatchers("/upload", "/storage/upload").authenticated()
                        .requestMatchers(HttpMethod.GET, "/posts", "/posts/**", "/users/*/posts").permitAll()
                        .requestMatchers("/posts", "/posts/**").authenticated()
                        .requestMatchers("/profile-access/*", "/users/*").permitAll()
                        .anyRequest().denyAll())
                .addFilterBefore(bearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
