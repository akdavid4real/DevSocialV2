package com.devsocial.backend.users;

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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(UsersControllerTest.Fakes.class)
class UsersControllerTest {
    private static final UUID USER_ID = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID SUPABASE_ID = UUID.fromString("24ab646b-8b7a-4b83-939d-f327dd4d1c5f");
    private static final UUID SESSION_ID = UUID.fromString("f18f6d09-c48a-46aa-9813-8695c709bc43");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsCurrentProfileThroughTheSharedBearerFilter() throws Exception {
        mockMvc.perform(get("/users/profile").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(USER_ID.toString()))
                .andExpect(jsonPath("$.data.username").value("springdev"));
    }

    @Test
    void completesOnboardingWhenInterestsAreSubmitted() throws Exception {
        mockMvc.perform(put("/users/onboarding")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"techStack\":[\"Java\"],\"interests\":[\"backend\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.data.techStack[0]").value("Java"));
    }

    @Test
    void returnsNestedAppearanceDefaultsExpectedByExistingClients() throws Exception {
        mockMvc.perform(get("/users/appearance-settings").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.appearanceSettings.theme").value("system"))
                .andExpect(jsonPath("$.data.data.appearanceSettings.fontSize").value("medium"));
    }

    @Test
    void keepsSearchPublic() throws Exception {
        mockMvc.perform(get("/users/search").param("q", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("springdev"));
    }

    @Test
    void rejectsUnauthorizedProfileFieldsWithCompatibilityEnvelope() throws Exception {
        mockMvc.perform(patch("/users/profile")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("property role should not exist"));
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
        UserRepository users() {
            return new FakeUserRepository();
        }
    }

    private static class FakeUserRepository implements UserRepository {
        private final Map<String, Object> profile = new LinkedHashMap<>();
        private final Map<String, Map<String, Object>> settings = new LinkedHashMap<>();

        private FakeUserRepository() {
            profile.put("id", USER_ID);
            profile.put("username", "springdev");
            profile.put("onboardingCompleted", false);
        }

        @Override
        public Optional<Map<String, Object>> findFull(UUID userId) {
            return Optional.of(new LinkedHashMap<>(profile));
        }

        @Override
        public Optional<Map<String, Object>> findPublicByUsername(String username) {
            return Optional.of(new LinkedHashMap<>(profile));
        }

        @Override
        public Optional<Map<String, Object>> findOnboarding(UUID userId) {
            return Optional.of(new LinkedHashMap<>(profile));
        }

        @Override
        public Map<String, Object> updateFields(UUID userId, Map<String, Object> fields) {
            profile.putAll(fields);
            return new LinkedHashMap<>(profile);
        }

        @Override
        public List<Map<String, Object>> search(String query, int limit) {
            return List.of(Map.of("id", USER_ID, "username", "springdev"));
        }

        @Override
        public List<Map<String, Object>> leaderboard(String period, int limit) {
            return List.of(Map.of("id", USER_ID, "username", "springdev", "points", 10));
        }

        @Override
        public Map<String, Object> readJsonSettings(UUID userId, String field) {
            return settings.getOrDefault(field, Map.of());
        }

        @Override
        public void writeJsonSettings(UUID userId, String field, Map<String, Object> value) {
            settings.put(field, new LinkedHashMap<>(value));
        }
    }
}
