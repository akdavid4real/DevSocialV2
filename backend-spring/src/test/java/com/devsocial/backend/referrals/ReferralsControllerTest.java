package com.devsocial.backend.referrals;

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
@Import(ReferralsControllerTest.Fakes.class)
class ReferralsControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");

    @Autowired MockMvc mockMvc;

    @Test
    void validationIsPublicAndValidated() throws Exception {
        mockMvc.perform(post("/referrals/validate").contentType("application/json")
                        .content("{\"referralCode\":\"SPRING42\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.valid").value(true));
        mockMvc.perform(post("/referrals/validate").contentType("application/json")
                        .content("{\"referralCode\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ownerRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/referrals/code")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/referrals/stats")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/referrals/expire-old")).andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedReferralWorkflowIsRouted() throws Exception {
        mockMvc.perform(get("/referrals/code").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.referralCode").value("SPRING42"));
        mockMvc.perform(get("/referrals/stats").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.stats.total.count").value(2));
        mockMvc.perform(post("/referrals/expire-old").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.count").value(1));
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
        @Bean @Primary Referrals referrals() { return new FakeReferrals(); }
    }

    private static class FakeReferrals implements Referrals {
        public Map<String, Object> getOrCreateCode(UUID userId) { return Map.of("referralCode", "SPRING42"); }
        public Map<String, Object> stats(UUID userId) { return Map.of("stats", Map.of("total", Map.of("count", 2))); }
        public Map<String, Object> validate(String code) { return Map.of("valid", true); }
        public Map<String, Object> expireOld() { return Map.of("count", 1); }
    }
}
