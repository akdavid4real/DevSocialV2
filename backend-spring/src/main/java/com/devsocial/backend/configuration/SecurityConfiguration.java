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
                        .requestMatchers("/users/search", "/users/leaderboard", "/affiliations").permitAll()
                        .requestMatchers(
                                "/auth/me",
                                "/auth/change-password",
                                "/auth/delete-account",
                                "/auth/logout",
                                "/auth/logout-all",
                                "/auth/security-stats",
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
                        .requestMatchers("/notifications", "/notifications/**").authenticated()
                        .requestMatchers("/messages", "/messages/**").authenticated()
                        .requestMatchers("/users/export-data").authenticated()
                        .requestMatchers("/users/ai-usage").authenticated()
                        .requestMatchers("/users/dashboard").authenticated()
                        .requestMatchers(HttpMethod.POST, "/users/*/pin-post").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/users/*/unpin-post/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/posts", "/posts/**", "/users/*/posts").permitAll()
                        .requestMatchers(HttpMethod.GET, "/search", "/trending").permitAll()
                        .requestMatchers(HttpMethod.GET, "/communities", "/communities/*", "/communities/*/posts")
                        .permitAll()
                        .requestMatchers("/communities", "/communities/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/projects/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/projects", "/projects/*").permitAll()
                        .requestMatchers("/projects", "/projects/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/knowledge-bank", "/knowledge-bank/*").permitAll()
                        .requestMatchers("/knowledge-bank", "/knowledge-bank/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/referrals/validate").permitAll()
                        .requestMatchers("/referrals/**").authenticated()
                        .requestMatchers("/feedback", "/feedback/**").authenticated()
                        .requestMatchers("/reports", "/reports/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/link-preview").permitAll()
                        .requestMatchers(HttpMethod.GET, "/challenges", "/challenges/*/leaderboard").permitAll()
                        .requestMatchers("/challenges/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/posts/summarize", "/posts/explain", "/ai/enhance-text")
                        .authenticated()
                        .requestMatchers(HttpMethod.GET,
                                "/admin/dashboard/stats",
                                "/admin/dashboard/user-growth",
                                "/admin/ai-logs",
                                "/admin/reports",
                                "/admin/reports/*"
                        ).authenticated()
                        .requestMatchers(HttpMethod.PUT, "/admin/reports/*/resolve").authenticated()
                        .requestMatchers(HttpMethod.GET, "/admin/posts", "/admin/audit-logs").authenticated()
                        .requestMatchers(HttpMethod.GET, "/admin/users", "/admin/users/*").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/admin/users/*/role").authenticated()
                        .requestMatchers(HttpMethod.POST, "/admin/users/*/ban", "/admin/users/*/unban")
                        .authenticated()
                        .requestMatchers(HttpMethod.PUT, "/admin/posts/*/status").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/admin/posts/*").authenticated()
                        .requestMatchers(HttpMethod.GET,
                                "/users/*/activities",
                                "/users/*/liked-posts",
                                "/users/*/commented-posts",
                                "/users/*/stats",
                                "/users/*/activity-heatmap",
                                "/users/*/pinned-posts"
                        ).permitAll()
                        .requestMatchers("/posts", "/posts/**").authenticated()
                        .requestMatchers("/profile-access/*", "/users/*").permitAll()
                        .anyRequest().denyAll())
                .addFilterBefore(bearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
