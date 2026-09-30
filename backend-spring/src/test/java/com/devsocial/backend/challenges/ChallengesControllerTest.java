package com.devsocial.backend.challenges;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ChallengesControllerTest.Fakes.class)
class ChallengesControllerTest {
    private static final UUID USER_ID = UUID.fromString("0fc643d2-3618-41aa-b1e9-eeef61f4be68");
    private static final UUID SUPABASE_ID = UUID.fromString("9625c1b2-16de-4502-bc14-bb07325a5542");
    private static final UUID SESSION_ID = UUID.fromString("c1ee9983-9890-428a-9224-c37eadc32c9a");
    private static final UUID CHALLENGE_ID = UUID.fromString("7dd8d428-d594-4f57-a5ea-fb4752eef3bd");

    @Autowired MockMvc mockMvc;

    @Test
    void activeChallengesAndLeaderboardArePublic() throws Exception {
        mockMvc.perform(get("/challenges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(CHALLENGE_ID.toString()))
                .andExpect(jsonPath("$.data[0].participation").doesNotExist());
        mockMvc.perform(get("/challenges/{id}/leaderboard", CHALLENGE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].rank").value(1));
    }

    @Test
    void userChallengeMutationsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/challenges/user")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/challenges").contentType("application/json").content(validChallenge()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/challenges/{id}/join", CHALLENGE_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/challenges/{id}/submit", CHALLENGE_ID)
                        .contentType("application/json").content("{\"progress\":100}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedJoinAndSubmissionPreserveParticipationShape() throws Exception {
        mockMvc.perform(post("/challenges/{id}/join", CHALLENGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(USER_ID.toString()))
                .andExpect(jsonPath("$.data.challenge.id").value(CHALLENGE_ID.toString()));
        mockMvc.perform(post("/challenges/{id}/submit", CHALLENGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"progress\":100,\"submissionData\":{\"note\":\"done\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.progress").value(100));
    }

    @Test
    void challengeCreationValidatesTheExistingDtoContract() throws Exception {
        mockMvc.perform(post("/challenges").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"title\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/challenges").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(validChallenge()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("LEARNING"));
    }

    private static String validChallenge() {
        return """
                {"title":"Spring Week","description":"Ship a Spring Boot backend feature",
                 "type":"LEARNING","difficulty":"MEDIUM","requirements":{"target":1},
                 "rewards":{"xp":100},"startDate":"2026-09-01T00:00:00Z",
                 "endDate":"2026-10-01T00:00:00Z"}
                """;
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
        @Bean @Primary Challenges challenges() {
            return new Challenges() {
                public List<Map<String, Object>> findActive(UUID userId) {
                    return List.of(map("id", CHALLENGE_ID, "title", "Spring Week", "participation", null));
                }
                public Map<String, Object> create(UUID userId, CreateChallengeRequest request) {
                    return map("id", CHALLENGE_ID, "title", request.title(), "type", request.type());
                }
                public List<Map<String, Object>> findUserChallenges(UUID userId) {
                    return List.of(participation("ACTIVE", 0));
                }
                public Map<String, Object> join(UUID userId, UUID challengeId) {
                    return participation("ACTIVE", 0);
                }
                public Map<String, Object> submit(UUID userId, UUID challengeId,
                        SubmitChallengeProgressRequest request) {
                    return participation(request.progress() >= 100 ? "COMPLETED" : "ACTIVE", request.progress());
                }
                public List<Map<String, Object>> leaderboard(UUID challengeId) {
                    return List.of(map("id", UUID.randomUUID(), "rank", 1, "progress", 100));
                }
                private Map<String, Object> participation(String status, int progress) {
                    return map("id", UUID.randomUUID(), "userId", USER_ID, "challengeId", CHALLENGE_ID,
                            "status", status, "progress", progress,
                            "challenge", map("id", CHALLENGE_ID, "title", "Spring Week"));
                }
            };
        }
    }

    private static Map<String, Object> map(Object... values) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }
}
