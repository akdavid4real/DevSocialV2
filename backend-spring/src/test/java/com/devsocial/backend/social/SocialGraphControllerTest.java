package com.devsocial.backend.social;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(SocialGraphControllerTest.Fakes.class)
class SocialGraphControllerTest {
    private static final UUID USER_ID = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID TARGET_ID = UUID.fromString("9ddd1835-6bc4-4c74-9163-2441c49b96f8");
    private static final UUID REQUEST_ID = UUID.fromString("c809353d-02d1-4307-9413-c017c513d214");
    private static final UUID SUPABASE_ID = UUID.fromString("24ab646b-8b7a-4b83-939d-f327dd4d1c5f");
    private static final UUID SESSION_ID = UUID.fromString("f18f6d09-c48a-46aa-9813-8695c709bc43");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicProfileRemainsAvailableWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/users/private-dev"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("private-dev"))
                .andExpect(jsonPath("$.data.bio").value("Spring developer"));
    }

    @Test
    void profileAccessExposesRelationshipStateWithoutProtectedFields() throws Exception {
        mockMvc.perform(get("/profile-access/private-dev").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isPrivate").value(true))
                .andExpect(jsonPath("$.data.canViewContent").value(false))
                .andExpect(jsonPath("$.data.followRequested").value(true))
                .andExpect(jsonPath("$.data.bio").value(""));
    }

    @Test
    void followRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(post("/follow/{id}", TARGET_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void malformedRelationshipIdsReturnBadRequestEnvelope() throws Exception {
        mockMvc.perform(post("/follow/not-a-uuid").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    void followPreservesPrivateRequestContract() throws Exception {
        mockMvc.perform(post("/follow/{id}", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(false))
                .andExpect(jsonPath("$.data.requested").value(true))
                .andExpect(jsonPath("$.data.requestId").value(REQUEST_ID.toString()));
    }

    @Test
    void acceptsIncomingRequest() throws Exception {
        mockMvc.perform(post("/follow/requests/{id}/accept", REQUEST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.following").value(true))
                .andExpect(jsonPath("$.data.requestStatus").value("ACCEPTED"));
    }

    @Test
    void blockedUsersKeepLegacyNestedDataShape() throws Exception {
        mockMvc.perform(get("/users/blocked").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].id").value(TARGET_ID.toString()))
                .andExpect(jsonPath("$.data.data[0].username").value("private-dev"));
    }

    @Test
    void blockAndUnblockRoutesKeepExistingMessages() throws Exception {
        mockMvc.perform(post("/users/block/{id}", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.blockedId").value(TARGET_ID.toString()));
        mockMvc.perform(delete("/users/unblock/{id}", TARGET_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("User unblocked successfully"));
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
        SocialGraph socialGraph() {
            return new FakeSocialGraph();
        }
    }

    private static class FakeSocialGraph implements SocialGraph {
        @Override
        public Map<String, Object> profile(String username, Optional<UUID> viewerId, boolean summaryOnly) {
            Map<String, Object> profile = new LinkedHashMap<>();
            profile.put("id", TARGET_ID);
            profile.put("username", username);
            profile.put("bio", summaryOnly ? "" : "Spring developer");
            if (summaryOnly) {
                profile.put("isPrivate", true);
                profile.put("canViewContent", false);
                profile.put("followRequested", true);
            }
            return profile;
        }

        @Override
        public Map<String, Object> follow(UUID actorId, UUID targetId) {
            return Map.of("following", false, "requested", true, "requestId", REQUEST_ID);
        }

        @Override
        public Map<String, Object> unfollow(UUID actorId, UUID targetId) {
            return Map.of("following", false);
        }

        @Override
        public Map<String, Object> followState(UUID actorId, UUID targetId) {
            return Map.of("isFollowing", false);
        }

        @Override
        public Map<String, Object> incomingRequests(UUID actorId, int page, int limit) {
            return Map.of("requests", List.of(), "total", 0, "page", page, "lastPage", 0);
        }

        @Override
        public Map<String, Object> outgoingRequests(UUID actorId, int page, int limit) {
            return incomingRequests(actorId, page, limit);
        }

        @Override
        public Map<String, Object> acceptRequest(UUID actorId, UUID requestId) {
            return Map.of("following", true, "requestStatus", "ACCEPTED");
        }

        @Override
        public Map<String, Object> rejectRequest(UUID actorId, UUID requestId) {
            return Map.of("requestStatus", "REJECTED");
        }

        @Override
        public Map<String, Object> cancelRequest(UUID actorId, UUID requestId) {
            return Map.of("requestStatus", "CANCELLED");
        }

        @Override
        public Map<String, Object> followers(UUID userId, int page, int limit) {
            return Map.of("followers", List.of(), "total", 0, "page", page, "lastPage", 0);
        }

        @Override
        public Map<String, Object> following(UUID userId, int page, int limit) {
            return Map.of("following", List.of(), "total", 0, "page", page, "lastPage", 0);
        }

        @Override
        public List<Map<String, Object>> mutualFollowers(UUID actorId, UUID userId) {
            return List.of();
        }

        @Override
        public Map<String, Object> blockedUsers(UUID actorId) {
            return Map.of("data", List.of(Map.of(
                    "id", TARGET_ID, "username", "private-dev", "blockedAt", Instant.EPOCH)));
        }

        @Override
        public Map<String, Object> block(UUID actorId, UUID targetId) {
            return Map.of("message", "Blocked @private-dev", "data", Map.of("blockedId", targetId));
        }

        @Override
        public Map<String, Object> unblock(UUID actorId, UUID targetId) {
            return Map.of("message", "User unblocked successfully");
        }
    }
}
