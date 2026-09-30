package com.devsocial.backend.discovery;

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
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(DiscoveryControllerTest.Fakes.class)
class DiscoveryControllerTest {
    private static final UUID USER_ID = UUID.fromString("7b2e23db-96a6-4dc8-ae9e-15ee9683488f");
    private static final UUID SUPABASE_ID = UUID.fromString("e7d2aa8a-1402-4515-8b08-565b98d5e3f9");
    private static final UUID SESSION_ID = UUID.fromString("820902c9-ed20-48f3-921a-415c1ce33a07");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void globalSearchPreservesTheLegacyNestedEnvelope() throws Exception {
        mockMvc.perform(get("/search").param("q", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.data.query").value("spring"))
                .andExpect(jsonPath("$.data.data.type").value("all"))
                .andExpect(jsonPath("$.data.data.results.posts[0].content").value("Spring discovery"))
                .andExpect(jsonPath("$.data.data.results.users[0].username").value("springdev"))
                .andExpect(jsonPath("$.data.data.results.tags[0].tag").value("spring"));
    }

    @Test
    void searchNormalizesInvalidTypeAndPaginationBounds() throws Exception {
        mockMvc.perform(get("/search")
                        .param("q", "java")
                        .param("type", "unknown")
                        .param("page", "0")
                        .param("limit", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.type").value("all"))
                .andExpect(jsonPath("$.data.data.pagination.currentPage").value(1))
                .andExpect(jsonPath("$.data.data.pagination.limit").value(50));
    }

    @Test
    void searchRequiresANonBlankQuery() throws Exception {
        mockMvc.perform(get("/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.error").value("Search query is required"));
    }

    @Test
    void optionalBearerIdentityReachesDiscoveryQueries() throws Exception {
        mockMvc.perform(get("/search")
                        .param("q", "spring")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.viewerAware").value(true));
    }

    @Test
    void trendingIsPublicAndKeepsItsDashboardShape() throws Exception {
        mockMvc.perform(get("/trending").param("period", "week"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.trendingPosts[0].trendingScore").value(11))
                .andExpect(jsonPath("$.data.trendingTopics[0].tag").value("spring"))
                .andExpect(jsonPath("$.data.risingUsers[0].username").value("springdev"))
                .andExpect(jsonPath("$.data.stats.hotPosts").value(1))
                .andExpect(jsonPath("$.data.period").value("week"))
                .andExpect(jsonPath("$.data.viewerAware").value(false));
    }

    @Test
    void trendingSupportsAnAuthenticatedViewer() throws Exception {
        mockMvc.perform(get("/trending").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("today"))
                .andExpect(jsonPath("$.data.viewerAware").value(true));
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
        Discovery discovery() {
            return new FakeDiscovery();
        }
    }

    private static class FakeDiscovery implements Discovery {
        @Override
        public Map<String, Object> search(
                String query,
                String type,
                int page,
                int limit,
                Optional<UUID> viewerId
        ) {
            if (query == null || query.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search query is required");
            }
            String normalizedType = List.of("all", "posts", "users", "tags").contains(type) ? type : "all";
            Map<String, Object> results = Map.of(
                    "posts", List.of(Map.of("content", "Spring discovery")),
                    "users", List.of(Map.of("username", "springdev")),
                    "tags", List.of(Map.of("tag", "spring"))
            );
            Map<String, Object> pagination = Map.of(
                    "currentPage", page,
                    "totalPages", 1,
                    "totalResults", 3,
                    "hasMore", false,
                    "limit", limit
            );
            Map<String, Object> data = Map.of(
                    "results", results,
                    "query", query,
                    "type", normalizedType,
                    "pagination", pagination,
                    "viewerAware", viewerId.isPresent()
            );
            return Map.of("success", true, "data", data);
        }

        @Override
        public Map<String, Object> trending(String period, Optional<UUID> viewerId) {
            return Map.of(
                    "trendingPosts", List.of(Map.of("trendingScore", 11)),
                    "trendingTopics", List.of(Map.of("tag", "spring", "posts", 1, "growth", "+100%")),
                    "risingUsers", List.of(Map.of("username", "springdev", "postsCount", 1)),
                    "stats", Map.of("hotPosts", 1, "totalViews", "20", "engagements", "6"),
                    "period", period,
                    "viewerAware", viewerId.isPresent()
            );
        }
    }
}
