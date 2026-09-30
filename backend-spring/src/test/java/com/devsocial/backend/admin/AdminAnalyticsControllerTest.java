package com.devsocial.backend.admin;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AdminAnalyticsControllerTest.Fakes.class)
class AdminAnalyticsControllerTest {
    private static final UUID USER_ID = UUID.fromString("83ee2cb0-84da-4af3-89d8-0addb86e0b62");
    private static final UUID SUPABASE_ID = UUID.fromString("c23045c2-d022-4911-ab1d-f14ae599a225");
    private static final UUID SESSION_ID = UUID.fromString("8d6fb1d3-8be2-4b62-8786-8744480d5477");

    @Autowired MockMvc mockMvc;

    @Test
    void adminAnalyticsRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/admin/dashboard/stats")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/dashboard/user-growth")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/ai-logs")).andExpect(status().isUnauthorized());
    }

    @Test
    void dashboardAndGrowthPreserveTheWebShapes() throws Exception {
        mockMvc.perform(get("/admin/dashboard/stats").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.users.total").value(42))
                .andExpect(jsonPath("$.data.content.totalPosts").value(18))
                .andExpect(jsonPath("$.data.moderation.pendingReports").value(2));
        mockMvc.perform(get("/admin/dashboard/user-growth").param("days", "45")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].createdAt").exists())
                .andExpect(jsonPath("$.data[0]._count._all").value(3));
    }

    @Test
    void aiLogsPreserveFiltersPaginationStatisticsAndUserProjection() throws Exception {
        mockMvc.perform(get("/admin/ai-logs").param("page", "2").param("limit", "25")
                        .param("service", "GEMINI").param("taskType", "post_summarize")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].service").value("GEMINI"))
                .andExpect(jsonPath("$.data.data[0].user.username").value("admin"))
                .andExpect(jsonPath("$.data.meta.page").value(2))
                .andExpect(jsonPath("$.data.meta.limit").value(25))
                .andExpect(jsonPath("$.data.stats[0].avgExecutionTime").value(12));
    }

    @Test
    void analyticsQueriesRejectInvalidNumbersAndServices() throws Exception {
        mockMvc.perform(get("/admin/ai-logs").param("page", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/admin/ai-logs").param("service", "OPENAI")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest());
    }

    private static String bearer() {
        String payload = "{\"session_id\":\"" + SESSION_ID + "\"}";
        return "Bearer header." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + ".signature";
    }

    @TestConfiguration
    static class Fakes {
        @Bean @Primary SupabaseIdentityProvider identityProvider() { return token -> SUPABASE_ID; }
        @Bean @Primary AuthAccountRepository authAccounts() {
            return new AuthAccountRepository() {
                public boolean isSessionActive(UUID sessionId, UUID supabaseUserId) { return true; }
                public Optional<AuthAccount> findBySupabaseUserId(UUID id) {
                    return Optional.of(new AuthAccount(USER_ID, false));
                }
            };
        }
        @Bean @Primary AdminAnalytics adminAnalytics() {
            return new AdminAnalytics() {
                public Map<String, Object> dashboard(UUID actorId) {
                    return Map.of("users", Map.of("total", 42, "active", 9, "blocked", 1, "newToday", 3),
                            "content", Map.of("totalPosts", 18, "totalComments", 31, "postsToday", 4),
                            "moderation", Map.of("pendingReports", 2));
                }
                public List<Map<String, Object>> userGrowth(UUID actorId, int days) {
                    return List.of(Map.of("createdAt", Instant.parse("2026-09-30T12:00:00Z"),
                            "_count", Map.of("_all", 3)));
                }
                public Map<String, Object> aiLogs(UUID actorId, int page, int limit,
                        String service, String taskType) {
                    Map<String, Object> log = Map.of("id", UUID.randomUUID(), "service", service,
                            "taskType", taskType, "user", Map.of("id", USER_ID, "username", "admin"));
                    return Map.of("data", List.of(log),
                            "meta", Map.of("total", 30, "page", page, "limit", limit, "totalPages", 2),
                            "stats", List.of(Map.of("service", service, "taskType", taskType,
                                    "count", 30, "avgExecutionTime", 12)));
                }
            };
        }
    }
}
