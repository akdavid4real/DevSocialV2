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
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AdminReportsControllerTest.Fakes.class)
class AdminReportsControllerTest {
    private static final UUID USER_ID = UUID.fromString("0d6ba7c9-4305-41a3-9591-4e835931884a");
    private static final UUID SUPABASE_ID = UUID.fromString("4d0a853d-8214-4fab-8a6d-548082538535");
    private static final UUID SESSION_ID = UUID.fromString("35a836c0-b9f8-4732-adf4-c5d594b1c326");
    private static final UUID REPORT_ID = UUID.fromString("03b822b3-0892-4b50-a7e2-5bf9a7525425");

    @Autowired MockMvc mockMvc;

    @Test
    void reportModerationRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/admin/reports")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/reports/{id}", REPORT_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/admin/reports/{id}/resolve", REPORT_ID)
                        .contentType("application/json").content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reportInboxPreservesEnrichedPaginationShape() throws Exception {
        mockMvc.perform(get("/admin/reports").param("status", "PENDING").param("page", "2")
                        .param("limit", "20").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].id").value(REPORT_ID.toString()))
                .andExpect(jsonPath("$.data.data[0].reporter.username").value("reporter"))
                .andExpect(jsonPath("$.data.data[0].reportedUser.username").value("target"))
                .andExpect(jsonPath("$.data.data[0].reportedPost.id").exists())
                .andExpect(jsonPath("$.data.meta.page").value(2));
    }

    @Test
    void reportDetailsAndResolutionPreserveTheirContracts() throws Exception {
        mockMvc.perform(get("/admin/reports/{id}", REPORT_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(REPORT_ID.toString()))
                .andExpect(jsonPath("$.data.reportedUser.email").value("target@example.com"));
        mockMvc.perform(put("/admin/reports/{id}/resolve", REPORT_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"status\":\"RESOLVED\",\"action\":\"POST_REMOVED\","
                                + "\"reviewNote\":\"Confirmed violation\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.action").value("POST_REMOVED"));
    }

    @Test
    void reportFiltersPaginationAndResolutionEnumsAreValidated() throws Exception {
        mockMvc.perform(get("/admin/reports").param("status", "NOPE")
                        .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isBadRequest());
        mockMvc.perform(get("/admin/reports").param("page", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isBadRequest());
        mockMvc.perform(put("/admin/reports/{id}/resolve", REPORT_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"status\":\"RESOLVED\",\"action\":\"NOPE\"}"))
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
        @Bean @Primary AdminReports adminReports() {
            return new AdminReports() {
                public Map<String, Object> findAll(UUID actorId, String status, int page, int limit) {
                    return Map.of("data", List.of(summary()),
                            "meta", Map.of("total", 25, "page", page, "limit", limit, "totalPages", 2));
                }
                public Map<String, Object> findOne(UUID actorId, UUID reportId) {
                    Map<String, Object> result = new java.util.LinkedHashMap<>(summary());
                    result.put("reportedUser", Map.of("id", UUID.randomUUID(), "username", "target",
                            "email", "target@example.com", "role", "USER", "isBlocked", false));
                    return result;
                }
                public Map<String, Object> resolve(UUID actorId, UUID reportId,
                        ResolveAdminReportRequest request) {
                    return Map.of("id", reportId, "status", request.status(), "action", request.action());
                }
                private Map<String, Object> summary() {
                    return Map.of("id", REPORT_ID, "status", "PENDING",
                            "reporter", Map.of("username", "reporter"),
                            "reportedUser", Map.of("username", "target"),
                            "reportedPost", Map.of("id", UUID.randomUUID(), "content", "reported"));
                }
            };
        }
    }
}
