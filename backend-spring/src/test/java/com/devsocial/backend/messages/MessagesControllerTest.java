package com.devsocial.backend.messages;

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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(MessagesControllerTest.Fakes.class)
class MessagesControllerTest {
    private static final UUID USER_ID = UUID.fromString("bde94213-f5a2-45d0-9ae8-257ce7426f21");
    private static final UUID OTHER_USER_ID = UUID.fromString("7234d9f5-b2cc-441d-b9ad-60a94382cf26");
    private static final UUID CONVERSATION_ID = UUID.fromString("86de7918-22c0-4e47-8124-57c9dd718843");
    private static final UUID MESSAGE_ID = UUID.fromString("13414361-c479-4546-aec7-0551468c244c");
    private static final UUID SUPABASE_ID = UUID.fromString("9b66e093-144e-4cff-b27d-27790944023d");
    private static final UUID SESSION_ID = UUID.fromString("3ce9dd5f-7055-4daa-a9aa-907db538725b");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void allMessageRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/messages/conversations"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + OTHER_USER_ID + "\",\"content\":\"hello\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void conversationsKeepThePlainArrayContractUsedByTheWebClient() throws Exception {
        mockMvc.perform(get("/messages/conversations").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(CONVERSATION_ID.toString()))
                .andExpect(jsonPath("$.data[0].otherUser.username").value("webdev"))
                .andExpect(jsonPath("$.data[0].lastMessage.content").value("Hello from Spring"))
                .andExpect(jsonPath("$.data[0].unreadCount").value(2));
    }

    @Test
    void unreadCountRemainsANumber() throws Exception {
        mockMvc.perform(get("/messages/unread-count").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));
    }

    @Test
    void conversationCreationAndMessageSendingKeepTheirShapes() throws Exception {
        mockMvc.perform(post("/messages/conversations")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantId\":\"" + OTHER_USER_ID + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(CONVERSATION_ID.toString()));

        mockMvc.perform(post("/messages")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + OTHER_USER_ID + "\",\"content\":\"Hello from Spring\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(MESSAGE_ID.toString()))
                .andExpect(jsonPath("$.data.sender.username").value("springdev"))
                .andExpect(jsonPath("$.data.receiver.username").value("webdev"));
    }

    @Test
    void malformedMessageBodiesUseTheSharedValidationEnvelope() throws Exception {
        mockMvc.perform(post("/messages")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + OTHER_USER_ID + "\",\"content\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    void messageHistoryKeepsChronologicalArrayAndLegacyLimitParsing() throws Exception {
        mockMvc.perform(get("/messages/{id}", CONVERSATION_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("limit", "12messages")
                        .param("before", MESSAGE_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(MESSAGE_ID.toString()))
                .andExpect(jsonPath("$.data[0].content").value("Hello from Spring"))
                .andExpect(jsonPath("$.data[0].requestedLimit").value(12))
                .andExpect(jsonPath("$.data[0].before").value(MESSAGE_ID.toString()));

        mockMvc.perform(get("/messages/{id}", CONVERSATION_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("limit", "not-a-number"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].requestedLimit").value(50));
    }

    @Test
    void markingConversationReadKeepsTheSuccessShape() throws Exception {
        mockMvc.perform(patch("/messages/{id}/read", CONVERSATION_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true));
    }

    @Test
    void reactionRoutesKeepTheLegacyNestedEnvelope() throws Exception {
        mockMvc.perform(post("/messages/{conversationId}/{messageId}/reactions", CONVERSATION_ID, MESSAGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"🔥\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.data.messageId").value(MESSAGE_ID.toString()))
                .andExpect(jsonPath("$.data.data.reactions[0].emoji").value("🔥"));

        mockMvc.perform(delete("/messages/{conversationId}/{messageId}/reactions", CONVERSATION_ID, MESSAGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.reactions").isEmpty());
    }

    @Test
    void blankAndOversizedReactionsAreRejected() throws Exception {
        mockMvc.perform(post("/messages/{conversationId}/{messageId}/reactions", CONVERSATION_ID, MESSAGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Reaction emoji is required"));

        mockMvc.perform(post("/messages/{conversationId}/{messageId}/reactions", CONVERSATION_ID, MESSAGE_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emoji\":\"12345678901234567\"}"))
                .andExpect(status().isBadRequest());
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
        Messages messages() {
            return new FakeMessages();
        }
    }

    private static class FakeMessages implements Messages {
        @Override
        public Map<String, Object> send(UUID userId, SendMessageRequest request) {
            return message();
        }

        @Override
        public Map<String, Object> getOrCreateConversation(UUID userId, UUID participantId) {
            return Map.of("id", CONVERSATION_ID);
        }

        @Override
        public List<Map<String, Object>> conversations(UUID userId) {
            return List.of(Map.of(
                    "id", CONVERSATION_ID,
                    "lastMessage", message(),
                    "lastMessageAt", Instant.parse("2026-09-30T12:00:00Z"),
                    "otherUser", otherUser(),
                    "unreadCount", 2
            ));
        }

        @Override
        public long unreadCount(UUID userId) {
            return 2;
        }

        @Override
        public List<Map<String, Object>> messages(
                UUID userId,
                UUID conversationId,
                int limit,
                String before
        ) {
            Map<String, Object> value = new java.util.LinkedHashMap<>(message());
            value.put("requestedLimit", limit);
            if (before != null) value.put("before", before);
            return List.of(value);
        }

        @Override
        public Map<String, Object> markRead(UUID userId, UUID conversationId) {
            return Map.of("success", true);
        }

        @Override
        public Map<String, Object> addReaction(
                UUID userId,
                UUID conversationId,
                UUID messageId,
                String emoji
        ) {
            String normalized = emoji == null ? "" : emoji.trim();
            if (normalized.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reaction emoji is required");
            }
            return Map.of("success", true, "data", Map.of(
                    "messageId", messageId,
                    "reactions", List.of(Map.of("userId", userId, "emoji", normalized))
            ));
        }

        @Override
        public Map<String, Object> removeReaction(
                UUID userId,
                UUID conversationId,
                UUID messageId,
                String emoji
        ) {
            return Map.of("success", true, "data", Map.of(
                    "messageId", messageId,
                    "reactions", List.of()
            ));
        }

        private Map<String, Object> message() {
            return Map.of(
                    "id", MESSAGE_ID,
                    "conversationId", CONVERSATION_ID,
                    "senderId", USER_ID,
                    "receiverId", OTHER_USER_ID,
                    "content", "Hello from Spring",
                    "read", false,
                    "createdAt", Instant.parse("2026-09-30T12:00:00Z"),
                    "sender", Map.of("id", USER_ID, "username", "springdev"),
                    "receiver", otherUser()
            );
        }

        private Map<String, Object> otherUser() {
            return Map.of("id", OTHER_USER_ID, "username", "webdev");
        }
    }
}
