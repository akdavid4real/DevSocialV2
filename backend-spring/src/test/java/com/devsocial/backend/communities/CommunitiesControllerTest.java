package com.devsocial.backend.communities;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(CommunitiesControllerTest.Fakes.class)
class CommunitiesControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");
    private static final UUID ITEM_ID = UUID.fromString("702b88c8-dbd8-44bc-82a7-e24b47dc51d7");

    @Autowired MockMvc mockMvc;

    @Test
    void catalogIsPublicAndClampsPagination() throws Exception {
        mockMvc.perform(get("/communities").param("page", "0").param("limit", "999")
                        .param("search", "spring").param("category", "backend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.route").value("catalog"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.limit").value(50))
                .andExpect(jsonPath("$.data.viewer").value(false));
    }

    @Test
    void detailAndPostsArePublicWithOptionalIdentity() throws Exception {
        mockMvc.perform(get("/communities/spring-devs").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("detail"))
                .andExpect(jsonPath("$.data.viewer").value(true));
        mockMvc.perform(get("/communities/spring-devs/posts").param("limit", "75"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("posts"))
                .andExpect(jsonPath("$.data.limit").value(50));
    }

    @Test
    void mutationsRequireAuthentication() throws Exception {
        mockMvc.perform(post("/communities").contentType("application/json")
                        .content("{\"name\":\"Spring Devs\",\"description\":\"A Spring developer group\",\"category\":\"BACKEND\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/communities/spring-devs/join")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/communities/invitations/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void createsAValidatedWebCommunity() throws Exception {
        mockMvc.perform(post("/communities").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"name\":\"Spring Devs\",\"description\":\"A Spring developer group\",\"category\":\"BACKEND\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("create"));
        mockMvc.perform(post("/communities").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"name\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void supportsMembershipAndCommunityPosting() throws Exception {
        mockMvc.perform(post("/communities/spring-devs/join").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("join"));
        mockMvc.perform(post("/communities/spring-devs/posts").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"content\":\"Hello community\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("createPost"));
    }

    @Test
    void supportsInviteInboxAndResponses() throws Exception {
        mockMvc.perform(get("/communities/invitations/me").header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("page", "2").param("limit", "200"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("invitations"))
                .andExpect(jsonPath("$.data.limit").value(100));
        mockMvc.perform(post("/communities/invitations/{id}/accept", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accept").value(true));
        mockMvc.perform(post("/communities/invitations/{id}/reject", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accept").value(false));
    }

    @Test
    void supportsJoinRequestModeration() throws Exception {
        mockMvc.perform(get("/communities/spring-devs/join-requests").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("requests"));
        mockMvc.perform(post("/communities/spring-devs/join-requests/{id}/accept", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accept").value(true));
        mockMvc.perform(post("/communities/spring-devs/join-requests/{id}/reject", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accept").value(false));
    }

    @Test
    void supportsInvitingAndCancellingARequest() throws Exception {
        mockMvc.perform(post("/communities/spring-devs/invites/{id}", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("invite"));
        mockMvc.perform(delete("/communities/join-requests/{id}", ITEM_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("cancel"));
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
                public Optional<AuthAccount> findBySupabaseUserId(UUID id) { return Optional.of(new AuthAccount(USER_ID, false)); }
            };
        }
        @Bean @Primary Communities communities() { return new FakeCommunities(); }
    }

    private static class FakeCommunities implements Communities {
        public Map<String, Object> findAll(int page, int limit, String search, String category, Optional<UUID> viewer) {
            return Map.of("route", "catalog", "page", page, "limit", limit, "viewer", viewer.isPresent());
        }
        public Map<String, Object> create(UUID userId, CreateCommunityRequest request) { return Map.of("route", "create"); }
        public Map<String, Object> findOne(String value, Optional<UUID> viewer) { return Map.of("route", "detail", "viewer", viewer.isPresent()); }
        public Map<String, Object> toggleMembership(UUID userId, String value) { return Map.of("route", "join"); }
        public Map<String, Object> findPosts(String value, int page, int limit, Optional<UUID> viewer) { return Map.of("route", "posts", "limit", limit); }
        public Map<String, Object> createPost(UUID userId, String value, CreateCommunityPostRequest request) { return Map.of("route", "createPost"); }
        public Map<String, Object> invitations(UUID userId, int page, int limit) { return Map.of("route", "invitations", "limit", limit); }
        public Map<String, Object> respondToInvite(UUID userId, UUID inviteId, boolean accept) { return Map.of("route", "respond", "accept", accept); }
        public Map<String, Object> cancelJoinRequest(UUID userId, UUID requestId) { return Map.of("route", "cancel"); }
        public Map<String, Object> joinRequests(UUID actorId, String value, int page, int limit) { return Map.of("route", "requests"); }
        public Map<String, Object> reviewJoinRequest(UUID actorId, String value, UUID requestId, boolean accept) { return Map.of("route", "review", "accept", accept); }
        public Map<String, Object> invite(UUID actorId, String value, UUID inviteeId) { return Map.of("route", "invite"); }
    }
}
