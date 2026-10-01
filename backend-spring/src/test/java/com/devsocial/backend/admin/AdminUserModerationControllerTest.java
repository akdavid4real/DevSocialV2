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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(AdminUserModerationControllerTest.Fakes.class)
class AdminUserModerationControllerTest {
    private static final UUID ACTOR_ID = UUID.fromString("0d6ba7c9-4305-41a3-9591-4e835931884a");
    private static final UUID TARGET_ID = UUID.fromString("d4144315-d116-42c6-a045-f208f26d12cf");
    private static final UUID SUPABASE_ID = UUID.fromString("4d0a853d-8214-4fab-8a6d-548082538535");
    private static final UUID SESSION_ID = UUID.fromString("35a836c0-b9f8-4732-adf4-c5d594b1c326");

    @Autowired MockMvc mockMvc;

    @Test
    void userModerationRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(put("/admin/users/{id}/role", TARGET_ID).contentType("application/json")
                        .content("{\"role\":\"MODERATOR\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/admin/users/{id}/ban", TARGET_ID).contentType("application/json")
                        .content("{\"reason\":\"spam\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/admin/users/{id}/unban", TARGET_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/admin/users/{id}/reset-password", TARGET_ID).contentType("application/json")
                        .content("{\"newPassword\":\"new-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void roleBanAndUnbanPreserveWebContracts() throws Exception {
        mockMvc.perform(put("/admin/users/{id}/role", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"role\":\"MODERATOR\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("MODERATOR"));
        mockMvc.perform(post("/admin/users/{id}/ban", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"reason\":\"Confirmed abuse\",\"permanent\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.isBlocked").value(true));
        mockMvc.perform(post("/admin/users/{id}/unban", TARGET_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.isBlocked").value(false));
        mockMvc.perform(post("/admin/users/{id}/reset-password", TARGET_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"newPassword\":\"new-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Password reset successfully"));
    }

    @Test
    void rolesAndBanReasonsAreValidated() throws Exception {
        mockMvc.perform(put("/admin/users/{id}/role", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"role\":\"OWNER\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/admin/users/{id}/ban", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/admin/users/{id}/reset-password", TARGET_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()).contentType("application/json")
                        .content("{\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missionAndUnmigratedAdminRoutesRemainDenied() throws Exception {
        mockMvc.perform(get("/missions").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/admin/users/{id}", TARGET_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/bots").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isForbidden());
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
        @Bean @Primary AdminUserModeration adminUserModeration() {
            return new AdminUserModeration() {
                public Map<String, Object> updateRole(UUID actorId, UUID userId, String role) {
                    return Map.of("id", userId, "role", role);
                }
                public Map<String, Object> ban(UUID actorId, UUID userId, BanAdminUserRequest request) {
                    return Map.of("id", userId, "isBlocked", true);
                }
                public Map<String, Object> unban(UUID actorId, UUID userId) {
                    return Map.of("id", userId, "isBlocked", false);
                }
                public Map<String, Object> resetPassword(UUID actorId, UUID userId, String newPassword) {
                    return Map.of("success", true, "message", "Password reset successfully");
                }
            };
        }
    }
}
