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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AdminUsersControllerTest.Fakes.class)
class AdminUsersControllerTest {
    private static final UUID ACTOR_ID = UUID.fromString("0d6ba7c9-4305-41a3-9591-4e835931884a");
    private static final UUID TARGET_ID = UUID.fromString("d4144315-d116-42c6-a045-f208f26d12cf");
    private static final UUID SUPABASE_ID = UUID.fromString("4d0a853d-8214-4fab-8a6d-548082538535");
    private static final UUID SESSION_ID = UUID.fromString("35a836c0-b9f8-4732-adf4-c5d594b1c326");

    @Autowired MockMvc mockMvc;

    @Test
    void adminUserRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/admin/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/admin/users/{id}", TARGET_ID)).andExpect(status().isUnauthorized());
    }

    @Test
    void userDirectoryPreservesSearchAndPaginationContract() throws Exception {
        mockMvc.perform(get("/admin/users").param("page", "2").param("limit", "20")
                        .param("search", "ada").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].id").value(TARGET_ID.toString()))
                .andExpect(jsonPath("$.data.data[0].username").value("ada"))
                .andExpect(jsonPath("$.data.meta.page").value(2));
    }

    @Test
    void userDetailsPreserveRecentContentAndCounts() throws Exception {
        mockMvc.perform(get("/admin/users/{id}", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(TARGET_ID.toString()))
                .andExpect(jsonPath("$.data.posts[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data._count.posts").value(4))
                .andExpect(jsonPath("$.data._count.likes").value(8));
    }

    @Test
    void userDirectoryPaginationIsValidated() throws Exception {
        mockMvc.perform(get("/admin/users").param("page", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isBadRequest());
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
                    return Optional.of(new AuthAccount(ACTOR_ID, false));
                }
            };
        }
        @Bean @Primary AdminUsers adminUsers() {
            return new AdminUsers() {
                public Map<String, Object> findAll(UUID actorId, int page, int limit, String search) {
                    return Map.of("data", List.of(Map.of("id", TARGET_ID, "username", search)),
                            "meta", Map.of("total", 21, "page", page, "limit", limit, "totalPages", 2));
                }
                public Map<String, Object> findOne(UUID actorId, UUID userId) {
                    return Map.of("id", userId, "username", "ada",
                            "posts", List.of(Map.of("status", "ACTIVE")),
                            "_count", Map.of("posts", 4, "comments", 3, "likes", 8));
                }
            };
        }
    }
}
