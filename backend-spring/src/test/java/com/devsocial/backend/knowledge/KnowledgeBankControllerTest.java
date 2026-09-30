package com.devsocial.backend.knowledge;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(KnowledgeBankControllerTest.Fakes.class)
class KnowledgeBankControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");
    private static final UUID ENTRY_ID = UUID.fromString("702b88c8-dbd8-44bc-82a7-e24b47dc51d7");

    @Autowired MockMvc mockMvc;

    @Test
    void catalogAndDetailsArePublic() throws Exception {
        mockMvc.perform(get("/knowledge-bank").param("page", "0").param("limit", "500")
                        .param("technology", "Spring").param("category", "tutorial").param("search", "jdbc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("all"))
                .andExpect(jsonPath("$.data.page").value(1)).andExpect(jsonPath("$.data.limit").value(50));
        mockMvc.perform(get("/knowledge-bank/{id}", ENTRY_ID))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("one"));
    }

    @Test
    void publishingRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/knowledge-bank").contentType("application/json").content(validEntry()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedPublishingPreservesTheValidatedContract() throws Exception {
        mockMvc.perform(post("/knowledge-bank").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(validEntry()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("create"));
        mockMvc.perform(post("/knowledge-bank").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"title\":\"x\",\"technology\":\"J\",\"category\":\"UNKNOWN\",\"content\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }

    private static String validEntry() {
        return "{\"title\":\"Spring Transactions\",\"technology\":\"Spring\",\"category\":\"TUTORIAL\","
                + "\"content\":\"A sufficiently detailed guide to Spring transactions.\",\"tags\":[\"jdbc\"]}";
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
        @Bean @Primary KnowledgeBank knowledgeBank() { return new FakeKnowledgeBank(); }
    }

    private static class FakeKnowledgeBank implements KnowledgeBank {
        public Map<String, Object> findAll(int page, int limit, String technology, String category, String search) {
            return Map.of("route", "all", "page", page, "limit", limit);
        }
        public Map<String, Object> create(UUID userId, CreateKnowledgeEntryRequest request) { return Map.of("route", "create"); }
        public Map<String, Object> findOne(UUID entryId) { return Map.of("route", "one"); }
    }
}
