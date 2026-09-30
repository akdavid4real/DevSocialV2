package com.devsocial.backend.feedback;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(FeedbackControllerTest.Fakes.class)
class FeedbackControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");
    private static final UUID FEEDBACK_ID = UUID.fromString("702b88c8-dbd8-44bc-82a7-e24b47dc51d7");

    @Autowired MockMvc mockMvc;

    @Test
    void allFeedbackRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/feedback")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/feedback/{id}", FEEDBACK_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/feedback").contentType("application/json").content(validFeedback()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listingNormalizesPaginationAndPassesTheRequestedView() throws Exception {
        mockMvc.perform(get("/feedback").header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("view", "all").param("page", "0").param("limit", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("all"))
                .andExpect(jsonPath("$.data.requestAll").value(true))
                .andExpect(jsonPath("$.data.page").value(1)).andExpect(jsonPath("$.data.limit").value(50));
    }

    @Test
    void createDetailCommentAndStatusRoutesPreserveTheContract() throws Exception {
        mockMvc.perform(post("/feedback").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(validFeedback()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("create"));
        mockMvc.perform(get("/feedback/{id}", FEEDBACK_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("one"));
        mockMvc.perform(post("/feedback/{id}/comments", FEEDBACK_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"content\":\"Please include logs\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("comment"));
        mockMvc.perform(patch("/feedback/{id}/status", FEEDBACK_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"status\":\"SOLVED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("SOLVED"));
    }

    @Test
    void validatesFeedbackCommentAndStatusBodies() throws Exception {
        mockMvc.perform(post("/feedback").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"type\":\"NOPE\",\"subject\":\"x\",\"description\":\"short\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/feedback/{id}/comments", FEEDBACK_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"content\":\"\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/feedback/{id}/status", FEEDBACK_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"status\":\"NOPE\"}"))
                .andExpect(status().isBadRequest());
    }

    private static String validFeedback() {
        return "{\"type\":\"BUG\",\"subject\":\"Broken project filter\","
                + "\"description\":\"The project filter does not retain its state.\",\"rating\":4}";
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
        @Bean @Primary Feedback feedback() { return new FakeFeedback(); }
    }

    private static class FakeFeedback implements Feedback {
        public Map<String, Object> findAll(UUID actor, boolean all, int page, int limit, String search, String status, String type) {
            return Map.of("route", "all", "requestAll", all, "page", page, "limit", limit);
        }
        public Map<String, Object> create(UUID actor, CreateFeedbackRequest request) { return Map.of("route", "create"); }
        public Map<String, Object> findOne(UUID actor, UUID id) { return Map.of("route", "one"); }
        public Map<String, Object> comment(UUID actor, UUID id, CreateFeedbackCommentRequest request) { return Map.of("route", "comment"); }
        public Map<String, Object> updateStatus(UUID actor, UUID id, String status) { return Map.of("route", "status", "status", status); }
    }
}
