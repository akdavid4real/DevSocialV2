package com.devsocial.backend.content;

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
@Import(ContentControllerTest.Fakes.class)
class ContentControllerTest {
    private static final UUID USER_ID = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID POST_ID = UUID.fromString("9ddd1835-6bc4-4c74-9163-2441c49b96f8");
    private static final UUID COMMENT_ID = UUID.fromString("c809353d-02d1-4307-9413-c017c513d214");
    private static final UUID SUPABASE_ID = UUID.fromString("24ab646b-8b7a-4b83-939d-f327dd4d1c5f");
    private static final UUID SESSION_ID = UUID.fromString("f18f6d09-c48a-46aa-9813-8695c709bc43");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousFeedKeepsThePaginationContract() throws Exception {
        mockMvc.perform(get("/posts").param("page", "1").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts[0].id").value(POST_ID.toString()))
                .andExpect(jsonPath("$.data.posts[0].isLiked").value(false))
                .andExpect(jsonPath("$.data.page").value(1));
    }

    @Test
    void authenticatedFeedCarriesViewerLikeState() throws Exception {
        mockMvc.perform(get("/posts").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.posts[0].isLiked").value(true));
    }

    @Test
    void searchRetainsTheLegacyArrayShape() throws Exception {
        mockMvc.perform(get("/posts").param("search", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].content").value("Spring content"));
    }

    @Test
    void detailCommentsRepliesAndUserPostsArePublicReads() throws Exception {
        mockMvc.perform(get("/posts/{id}", POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(POST_ID.toString()));
        mockMvc.perform(get("/posts/{id}/comments", POST_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.comments[0].id").value(COMMENT_ID.toString()));
        mockMvc.perform(get("/posts/comments/{id}/replies", COMMENT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.replies[0].parentId").value(COMMENT_ID.toString()));
        mockMvc.perform(get("/users/springdev/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].author.username").value("springdev"));
    }

    @Test
    void tagFeedPreservesTagMetadata() throws Exception {
        mockMvc.perform(get("/posts/tag/java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tag.slug").value("java"))
                .andExpect(jsonPath("$.data.posts[0].id").value(POST_ID.toString()));
    }

    @Test
    void malformedPostIdsReturnBadRequest() throws Exception {
        mockMvc.perform(get("/posts/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    void contentWritesRemainDeniedUntilTheirMutationInvariantsAreMigrated() throws Exception {
        mockMvc.perform(post("/posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"not routed yet\"}"))
                .andExpect(status().isForbidden());
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
        ContentQueries contentQueries() {
            return new FakeContentQueries();
        }
    }

    private static class FakeContentQueries implements ContentQueries {
        @Override
        public Object feed(Optional<UUID> viewerId, int page, int limit, String search) {
            List<Map<String, Object>> posts = List.of(post(viewerId.isPresent()));
            return search == null
                    ? Map.of("posts", posts, "total", 1, "page", page, "lastPage", page)
                    : posts;
        }

        @Override
        public Map<String, Object> tagged(Optional<UUID> viewerId, String tagName, int page, int limit) {
            return Map.of(
                    "tag", Map.of("name", tagName, "slug", tagName),
                    "posts", List.of(post(viewerId.isPresent())),
                    "total", 1, "page", page, "lastPage", page
            );
        }

        @Override
        public Map<String, Object> post(UUID postId, Optional<UUID> viewerId, String ip, String agent) {
            return post(viewerId.isPresent());
        }

        @Override
        public Map<String, Object> comments(UUID postId, Optional<UUID> viewerId, int page, int limit) {
            return Map.of("comments", List.of(comment(null)), "total", 1, "page", page, "lastPage", 1, "hasMore", false);
        }

        @Override
        public Map<String, Object> replies(UUID commentId, Optional<UUID> viewerId, int page, int limit) {
            return Map.of("replies", List.of(comment(commentId)), "total", 1, "page", page, "lastPage", 1, "hasMore", false);
        }

        @Override
        public Object userPosts(String username, Optional<UUID> viewerId) {
            return List.of(post(viewerId.isPresent()));
        }

        private Map<String, Object> post(boolean liked) {
            return Map.of(
                    "id", POST_ID,
                    "content", "Spring content",
                    "isLiked", liked,
                    "author", Map.of("id", USER_ID, "username", "springdev")
            );
        }

        private Map<String, Object> comment(UUID parentId) {
            java.util.LinkedHashMap<String, Object> value = new java.util.LinkedHashMap<>();
            value.put("id", COMMENT_ID);
            value.put("parentId", parentId);
            value.put("content", "A comment");
            return value;
        }
    }
}
