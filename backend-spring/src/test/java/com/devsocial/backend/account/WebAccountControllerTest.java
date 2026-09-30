package com.devsocial.backend.account;

import com.devsocial.backend.auth.AuthAccount;
import com.devsocial.backend.auth.AuthAccountRepository;
import com.devsocial.backend.auth.SupabaseIdentityProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(WebAccountControllerTest.Fakes.class)
class WebAccountControllerTest {
    private static final UUID USER_ID = UUID.fromString("c07684e2-997f-47e4-9507-3df920b70197");
    private static final UUID SUPABASE_ID = UUID.fromString("db9c256c-6c22-45a7-87ec-e4f860b09c6f");
    private static final UUID SESSION_ID = UUID.fromString("d0cd653b-3b4a-48f9-ac36-6d1900dc4f2e");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void affiliationsArePublicAndGroupedBySubtype() throws Exception {
        mockMvc.perform(get("/affiliations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.NIIT_Centres[0]").value("NIIT Lagos – Ikeja Centre"))
                .andExpect(jsonPath("$.data.Federal[0]").value("University of Lagos"));
    }

    @Test
    void securityStatsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/auth/security-stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void securityStatsKeepTheWebSettingsShape() throws Exception {
        mockMvc.perform(get("/auth/security-stats").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountCreated").value("2025-01-01T00:00:00Z"))
                .andExpect(jsonPath("$.data.lastLogin").value("2026-09-30T08:00:00Z"))
                .andExpect(jsonPath("$.data.totalLogins").value(14))
                .andExpect(jsonPath("$.data.recentLogins[0].userAgent").value("Chrome"))
                .andExpect(jsonPath("$.data.recentEvents[0].type").value("LOGIN"));
    }

    @Test
    void dataExportRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/users/export-data"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aiUsageRequiresAuthenticationAndKeepsTheLegacyNestedEnvelope() throws Exception {
        mockMvc.perform(get("/users/ai-usage"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/users/ai-usage").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.summaries.used").value(2))
                .andExpect(jsonPath("$.data.data.summaries.limit").value(5))
                .andExpect(jsonPath("$.data.data.summaries.remaining").value(3))
                .andExpect(jsonPath("$.data.data.isPremium").value(false));
    }

    @Test
    void dataExportKeepsTheExistingNestedDownloadEnvelope() throws Exception {
        mockMvc.perform(post("/users/export-data").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.user.username").value("springdev"))
                .andExpect(jsonPath("$.data.data.content.posts[0].content").value("Exported post"))
                .andExpect(jsonPath("$.data.data.accountActivity.notifications[0].title").value("Welcome"))
                .andExpect(jsonPath("$.data.data.statistics.totalPosts").value(1));
    }

    private static String bearer() {
        String payload = "{\"session_id\":\"" + SESSION_ID + "\"}";
        String encoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "Bearer header." + encoded + ".signature";
    }

    @TestConfiguration
    static class Fakes {
        @Bean
        @Primary
        SupabaseIdentityProvider identityProvider() {
            return token -> SUPABASE_ID;
        }

        @Bean
        @Primary
        AuthAccountRepository authAccounts() {
            return new AuthAccountRepository() {
                @Override
                public boolean isSessionActive(UUID sessionId, UUID supabaseUserId) {
                    return SESSION_ID.equals(sessionId) && SUPABASE_ID.equals(supabaseUserId);
                }

                @Override
                public Optional<AuthAccount> findBySupabaseUserId(UUID supabaseUserId) {
                    return Optional.of(new AuthAccount(USER_ID, false));
                }
            };
        }

        @Bean
        @Primary
        WebAccountSupport accountSupport() {
            return new FakeWebAccountSupport();
        }
    }

    private static class FakeWebAccountSupport implements WebAccountSupport {
        @Override
        public Map<String, Object> affiliations() {
            return Map.of(
                    "NIIT_Centres", List.of("NIIT Lagos – Ikeja Centre"),
                    "Federal", List.of("University of Lagos")
            );
        }

        @Override
        public Map<String, Object> securityStats(UUID userId) {
            return Map.of(
                    "accountCreated", Instant.parse("2025-01-01T00:00:00Z"),
                    "lastLogin", Instant.parse("2026-09-30T08:00:00Z"),
                    "lastPasswordChange", Instant.parse("2026-09-01T08:00:00Z"),
                    "totalLogins", 14,
                    "recentLogins", List.of(Map.of(
                            "createdAt", Instant.parse("2026-09-30T08:00:00Z"),
                            "userAgent", "Chrome"
                    )),
                    "recentEvents", List.of(Map.of("type", "LOGIN"))
            );
        }

        @Override
        public Map<String, Object> aiUsage(UUID userId) {
            return Map.of("data", Map.of(
                    "summaries", Map.of("used", 2, "limit", 5, "remaining", 3),
                    "isPremium", false
            ));
        }

        @Override
        public Map<String, Object> exportData(UUID userId) {
            return Map.of("data", Map.of(
                    "exportDate", Instant.parse("2026-09-30T12:00:00Z"),
                    "user", Map.of("id", userId, "username", "springdev"),
                    "content", Map.of(
                            "posts", List.of(Map.of("content", "Exported post")),
                            "comments", List.of(),
                            "projects", List.of(),
                            "knowledgeEntries", List.of(),
                            "feedback", List.of()
                    ),
                    "accountActivity", Map.of(
                            "xpLogs", List.of(),
                            "activities", List.of(),
                            "notifications", List.of(Map.of("title", "Welcome")),
                            "referrals", List.of(),
                            "blockedUsers", List.of()
                    ),
                    "statistics", Map.of("totalPosts", 1)
            ));
        }
    }
}
