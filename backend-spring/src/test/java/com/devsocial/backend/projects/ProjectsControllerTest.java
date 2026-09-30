package com.devsocial.backend.projects;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ProjectsControllerTest.Fakes.class)
class ProjectsControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");
    private static final UUID PROJECT_ID = UUID.fromString("702b88c8-dbd8-44bc-82a7-e24b47dc51d7");

    @Autowired MockMvc mockMvc;

    @Test
    void publicCatalogPreservesFiltersAndPaginationBounds() throws Exception {
        mockMvc.perform(get("/projects").param("page", "0").param("limit", "500")
                        .param("search", "social").param("status", "completed").param("tech", "Spring"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("all"))
                .andExpect(jsonPath("$.data.page").value(1)).andExpect(jsonPath("$.data.limit").value(50))
                .andExpect(jsonPath("$.data.search").value("social"))
                .andExpect(jsonPath("$.data.technology").value("Spring"));
    }

    @Test
    void projectDetailIsPublicAndBuildsStableGuestIdentity() throws Exception {
        mockMvc.perform(get("/projects/{id}", PROJECT_ID).header("User-Agent", "JUnit browser"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("one"))
                .andExpect(jsonPath("$.data.viewer").value(false))
                .andExpect(jsonPath("$.data.visitorKey").value(org.hamcrest.Matchers.startsWith("guest:")));
        mockMvc.perform(get("/projects/{id}", PROJECT_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.viewer").value(true))
                .andExpect(jsonPath("$.data.visitorKey").value("user:" + USER_ID));
    }

    @Test
    void myProjectsAndMutationsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/projects/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/projects").contentType("application/json").content(validProject()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/projects/{id}/status", PROJECT_ID).contentType("application/json")
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/projects/{id}", PROJECT_ID)).andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedOwnerWorkflowIsRouted() throws Exception {
        mockMvc.perform(get("/projects/me").header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("page", "2").param("limit", "100"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("mine"))
                .andExpect(jsonPath("$.data.limit").value(50));
        mockMvc.perform(post("/projects").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content(validProject()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("create"));
        mockMvc.perform(put("/projects/{id}/status", PROJECT_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("COMPLETED"));
        mockMvc.perform(delete("/projects/{id}", PROJECT_ID).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.route").value("remove"));
    }

    @Test
    void projectInputValidationMatchesTheWebContract() throws Exception {
        mockMvc.perform(post("/projects").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json")
                        .content("{\"title\":\"x\",\"description\":\"short\",\"githubUrl\":\"not-url\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/projects/{id}/status", PROJECT_ID).header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType("application/json").content("{\"status\":\"UNKNOWN\"}"))
                .andExpect(status().isBadRequest());
    }

    private static String validProject() {
        return "{\"title\":\"DevSocial Web\",\"description\":\"A project long enough for validation\","
                + "\"technologies\":[\"Spring Boot\"],\"status\":\"IN_PROGRESS\"}";
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
        @Bean @Primary Projects projects() { return new FakeProjects(); }
    }

    private static class FakeProjects implements Projects {
        public Map<String, Object> findAll(int page, int limit, String search, String status, String technology) {
            return Map.of("route", "all", "page", page, "limit", limit, "search", search, "technology", technology);
        }
        public Map<String, Object> findMine(UUID id, int page, int limit, String status) { return Map.of("route", "mine", "limit", limit); }
        public Map<String, Object> create(UUID id, CreateProjectRequest request) { return Map.of("route", "create"); }
        public Map<String, Object> findOne(UUID id, Optional<UUID> viewer, String visitorKey) {
            return Map.of("route", "one", "viewer", viewer.isPresent(), "visitorKey", visitorKey);
        }
        public Map<String, Object> updateStatus(UUID userId, UUID id, String status) { return Map.of("route", "status", "status", status); }
        public Map<String, Object> remove(UUID userId, UUID id) { return Map.of("route", "remove"); }
    }
}
