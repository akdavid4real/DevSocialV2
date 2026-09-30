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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AdminContentModerationControllerTest.Fakes.class)
class AdminContentModerationControllerTest {
    private static final UUID USER_ID = UUID.fromString("0d6ba7c9-4305-41a3-9591-4e835931884a");
    private static final UUID SUPABASE_ID = UUID.fromString("4d0a853d-8214-4fab-8a6d-548082538535");
    private static final UUID SESSION_ID = UUID.fromString("35a836c0-b9f8-4732-adf4-c5d594b1c326");
    private static final UUID POST_ID = UUID.fromString("4a393e0b-88f7-4afd-8d73-a6b73e8183ce");
    private static final UUID AUDIT_ID = UUID.fromString("bcb5eb3c-3ddb-425f-be85-25512813c7dd");

    @Autowired MockMvc mockMvc;

    @Test
    void moderationRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/admin/posts")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/admin/posts/{id}/status", POST_ID).contentType("application/json")
                        .content("{\"status\":\"BLOCKED\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/admin/posts/{id}", POST_ID).contentType("application/json")
                        .content("{\"reason\":\"spam\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/audit-logs")).andExpect(status().isUnauthorized());
    }

    @Test
    void postInboxPreservesEnrichedPaginationShape() throws Exception {
        mockMvc.perform(get("/admin/posts").param("status", "ACTIVE").param("page", "2")
                        .param("limit", "20").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].id").value(POST_ID.toString()))
                .andExpect(jsonPath("$.data.data[0].author.username").value("author"))
                .andExpect(jsonPath("$.data.meta.page").value(2));
    }

    @Test
    void statusDeleteAndAuditContractsArePreserved() throws Exception {
        mockMvc.perform(put("/admin/posts/{id}/status", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"status\":\"BLOCKED\",\"reason\":\"Confirmed spam\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("BLOCKED"));
        mockMvc.perform(delete("/admin/posts/{id}", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"reason\":\"Confirmed spam\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Post deleted successfully"));
        mockMvc.perform(get("/admin/audit-logs").param("page", "2").param("limit", "50")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.data[0].id").value(AUDIT_ID.toString()))
                .andExpect(jsonPath("$.data.meta.page").value(2));
    }

    @Test
    void postFiltersStatusesAndPaginationAreValidated() throws Exception {
        mockMvc.perform(get("/admin/posts").param("status", "NOPE")
                        .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isBadRequest());
        mockMvc.perform(get("/admin/audit-logs").param("limit", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isBadRequest());
        mockMvc.perform(put("/admin/posts/{id}/status", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"status\":\"NOPE\"}"))
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
        @Bean @Primary AdminContentModeration adminContentModeration() {
            return new AdminContentModeration() {
                public Map<String, Object> findPosts(UUID actorId, String status, int page, int limit) {
                    return Map.of("data", List.of(Map.of("id", POST_ID, "status", status,
                                    "author", Map.of("username", "author"))),
                            "meta", Map.of("total", 25, "page", page, "limit", limit, "totalPages", 2));
                }
                public Map<String, Object> updatePostStatus(UUID actorId, UUID postId,
                        UpdateAdminPostStatusRequest request) {
                    return Map.of("id", postId, "status", request.status());
                }
                public Map<String, Object> deletePost(UUID actorId, UUID postId, String reason) {
                    return Map.of("message", "Post deleted successfully");
                }
                public Map<String, Object> findAuditLogs(UUID actorId, int page, int limit) {
                    return Map.of("data", List.of(Map.of("id", AUDIT_ID, "action", "POST_DELETE")),
                            "meta", Map.of("total", 51, "page", page, "limit", limit, "totalPages", 2));
                }
            };
        }
    }
}
