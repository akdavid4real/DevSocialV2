package com.devsocial.backend.reports;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ReportsControllerTest.Fakes.class)
class ReportsControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");
    private static final UUID POST_ID = UUID.fromString("702b88c8-dbd8-44bc-82a7-e24b47dc51d7");

    @Autowired MockMvc mockMvc;

    @Test
    void reportSubmissionRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/reports").contentType("application/json").content(validReport()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedSubmissionPreservesTheRequestContract() throws Exception {
        mockMvc.perform(post("/reports").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(validReport()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(POST_ID.toString()))
                .andExpect(jsonPath("$.data.reason").value("SPAM"));
    }

    @Test
    void invalidPostReasonAndDescriptionAreRejected() throws Exception {
        mockMvc.perform(post("/reports").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"postId\":\"bad\",\"reason\":\"NOPE\"}"))
                .andExpect(status().isBadRequest());
        String longDescription = "x".repeat(501);
        mockMvc.perform(post("/reports").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"postId\":\"" + POST_ID
                                + "\",\"reason\":\"OTHER\",\"description\":\"" + longDescription + "\"}"))
                .andExpect(status().isBadRequest());
    }

    private static String validReport() {
        return "{\"postId\":\"" + POST_ID + "\",\"reason\":\"SPAM\",\"description\":\"Repeated promotion\"}";
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
        @Bean @Primary ReportSubmission reports() {
            return (reporterId, request) -> Map.of("id", request.postId(), "reason", request.reason());
        }
    }
}
