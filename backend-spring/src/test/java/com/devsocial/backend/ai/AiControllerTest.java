package com.devsocial.backend.ai;

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
@Import(AiControllerTest.Fakes.class)
class AiControllerTest {
    private static final UUID USER_ID = UUID.fromString("05891b58-36e7-490b-8067-ae45732ee7df");
    private static final UUID SUPABASE_ID = UUID.fromString("3b91b2ee-687c-45d1-bda4-1f453514891d");
    private static final UUID SESSION_ID = UUID.fromString("05448468-5b82-4859-a3c7-9744c1a8468a");

    @Autowired MockMvc mockMvc;

    @Test
    void allWritingAssistanceRoutesRequireAuthentication() throws Exception {
        String body = "{\"content\":\"Spring Boot migration is moving forward.\"}";
        mockMvc.perform(post("/posts/summarize").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/posts/explain").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/ai/enhance-text").contentType("application/json")
                        .content("{\"content\":\"ship it\",\"action\":\"casual\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedRoutesPreserveTheirExistingResponseShapes() throws Exception {
        String body = "{\"content\":\"Spring Boot migration is moving forward.\"}";
        mockMvc.perform(post("/posts/summarize").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.summary").value("summary"))
                .andExpect(jsonPath("$.data.remainingUsage").value(4))
                .andExpect(jsonPath("$.data.monthlyLimit").value(5));
        mockMvc.perform(post("/posts/explain").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.explanation").value("explanation"));
        mockMvc.perform(post("/ai/enhance-text").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"content\":\"ship it\",\"action\":\"professional\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.enhanced").value("professional: ship it"));
    }

    @Test
    void contentLengthsAndEnhancementActionsAreValidated() throws Exception {
        mockMvc.perform(post("/posts/summarize").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"content\":\"short\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/ai/enhance-text").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"content\":\"ship it\",\"action\":\"invalid\"}"))
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
        @Bean @Primary AiAssistance aiAssistance() {
            return new AiAssistance() {
                public Map<String, Object> summarize(UUID userId, String content) {
                    return Map.of("summary", "summary", "remainingUsage", 4, "monthlyLimit", 5);
                }
                public Map<String, Object> explain(UUID userId, String content) {
                    return Map.of("explanation", "explanation", "remainingUsage", 9, "monthlyLimit", 10);
                }
                public Map<String, Object> enhance(UUID userId, String content, String action) {
                    return Map.of("enhanced", action + ": " + content, "remainingUsage", 4, "monthlyLimit", 5);
                }
            };
        }
    }
}
