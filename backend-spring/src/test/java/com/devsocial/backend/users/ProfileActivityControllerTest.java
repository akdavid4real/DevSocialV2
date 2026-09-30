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
import java.time.Instant;
import java.util.Base64;
import java.util.List;
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
@Import(ProfileActivityControllerTest.Fakes.class)
class ProfileActivityControllerTest {
    private static final UUID USER_ID = UUID.fromString("08de7f54-b1c9-4ffd-a3b3-2278a935dce5");
    private static final UUID POST_ID = UUID.fromString("258aa35d-9c93-43bb-be9e-2b8ec99972f0");
    private static final UUID SUPABASE_ID = UUID.fromString("da97c6ae-2987-4b93-9148-7212580f60ea");
    private static final UUID SESSION_ID = UUID.fromString("bc604f21-73d5-49c9-a19e-b9122ef3ac2f");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void activitiesArePublicAndKeepTheirNestedPaginationContract() throws Exception {
        mockMvc.perform(get("/users/springdev/activities")
                        .param("page", "0")
                        .param("limit", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.data[0].type").value("POST_CREATED"))
                .andExpect(jsonPath("$.data.pagination.page").value(1))
                .andExpect(jsonPath("$.data.pagination.limit").value(100));
    }

    @Test
    void activityPaginationMatchesTheLegacyParseIntBehavior() throws Exception {
        mockMvc.perform(get("/users/springdev/activities")
                        .param("page", "2pages")
                        .param("limit", "not-a-number"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pagination.page").value(2))
                .andExpect(jsonPath("$.data.pagination.limit").value(20));
    }

    @Test
    void likedAndCommentedPostsKeepThePlainArrayShape() throws Exception {
        mockMvc.perform(get("/users/springdev/liked-posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(POST_ID.toString()))
                .andExpect(jsonPath("$.data[0].isLiked").value(false));

        mockMvc.perform(get("/users/springdev/commented-posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].content").value("Spring profile post"));
    }

    @Test
    void optionalBearerIdentityPersonalizesPostLikeState() throws Exception {
        mockMvc.perform(get("/users/springdev/liked-posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].isLiked").value(true));
    }

    @Test
    void statsAndHeatmapKeepTheWebDashboardShapes() throws Exception {
        mockMvc.perform(get("/users/springdev/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.data.postsCount").value(4))
                .andExpect(jsonPath("$.data.data.likesReceived").value(12));

        mockMvc.perform(get("/users/springdev/activity-heatmap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].date").value("2026-09-30"))
                .andExpect(jsonPath("$.data[0].count").value(3));
    }

    @Test
    void pinnedPostsKeepTheirInputOrderMarker() throws Exception {
        mockMvc.perform(get("/users/springdev/pinned-posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(POST_ID.toString()))
                .andExpect(jsonPath("$.data[0].isPinned").value(true));
    }

    @Test
    void pinMutationsRequireAuthentication() throws Exception {
        mockMvc.perform(post("/users/springdev/pin-post")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postId\":\"" + POST_ID + "\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/users/springdev/unpin-post/{id}", POST_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ownersCanPinAndUnpinTheirPosts() throws Exception {
        mockMvc.perform(post("/users/springdev/pin-post")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postId\":\"" + POST_ID + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Post pinned successfully"));

        mockMvc.perform(delete("/users/springdev/unpin-post/{id}", POST_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Post unpinned successfully"));
    }

    @Test
    void pinRequiresAPostId() throws Exception {
        mockMvc.perform(post("/users/springdev/pin-post")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400));
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
        ProfileActivity profileActivity() {
            return new FakeProfileActivity();
        }
    }

    private static class FakeProfileActivity implements ProfileActivity {
        @Override
        public Map<String, Object> activities(Optional<UUID> viewerId, String username, int page, int limit) {
            return Map.of(
                    "success", true,
                    "data", List.of(Map.of(
                            "type", "POST_CREATED",
                            "description", "Created a post",
                            "createdAt", Instant.parse("2026-09-30T12:00:00Z")
                    )),
                    "pagination", Map.of("page", page, "limit", limit, "total", 1)
            );
        }

        @Override
        public List<Map<String, Object>> likedPosts(
                Optional<UUID> viewerId,
                String username,
                int page,
                int limit
        ) {
            return List.of(post(viewerId.isPresent(), false));
        }

        @Override
        public List<Map<String, Object>> commentedPosts(
                Optional<UUID> viewerId,
                String username,
                int page,
                int limit
        ) {
            return List.of(post(viewerId.isPresent(), false));
        }

        @Override
        public Map<String, Object> stats(Optional<UUID> viewerId, String username) {
            return Map.of("success", true, "data", Map.of(
                    "postsCount", 4,
                    "commentsCount", 8,
                    "likesGiven", 6,
                    "likesReceived", 12
            ));
        }

        @Override
        public List<Map<String, Object>> heatmap(Optional<UUID> viewerId, String username) {
            return List.of(Map.of("date", "2026-09-30", "count", 3));
        }

        @Override
        public Map<String, Object> pin(UUID userId, String username, UUID postId) {
            return Map.of("success", true, "message", "Post pinned successfully");
        }

        @Override
        public Map<String, Object> unpin(UUID userId, String username, UUID postId) {
            return Map.of("success", true, "message", "Post unpinned successfully");
        }

        @Override
        public List<Map<String, Object>> pinnedPosts(Optional<UUID> viewerId, String username) {
            return List.of(post(viewerId.isPresent(), true));
        }

        private Map<String, Object> post(boolean liked, boolean pinned) {
            Map<String, Object> post = new java.util.LinkedHashMap<>();
            post.put("id", POST_ID);
            post.put("content", "Spring profile post");
            post.put("isLiked", liked);
            if (pinned) post.put("isPinned", true);
            return post;
        }
    }
}
