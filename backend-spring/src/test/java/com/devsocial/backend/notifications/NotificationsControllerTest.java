package com.devsocial.backend.notifications;

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
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(NotificationsControllerTest.Fakes.class)
class NotificationsControllerTest {
    private static final UUID USER_ID = UUID.fromString("0608ac8c-9784-447d-a72c-70b8a2782175");
    private static final UUID SENDER_ID = UUID.fromString("09dfaa9f-07f3-4312-b652-1b1f9766bbd1");
    private static final UUID NOTIFICATION_ID = UUID.fromString("1962a9f8-f383-4082-aa16-23203f1a810d");
    private static final UUID SUPABASE_ID = UUID.fromString("41600d55-97cd-4798-bbca-2393fcb8e5c6");
    private static final UUID SESSION_ID = UUID.fromString("0517578c-3a4f-47f6-b800-adba84dbe4bb");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void everyNotificationRouteRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/notifications"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/notifications/push-subscription"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listKeepsTheLegacyNestedEnvelopeAndUnreadCount() throws Exception {
        mockMvc.perform(get("/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("limit", "500")
                        .param("unread", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.data.notifications[0].id").value(NOTIFICATION_ID.toString()))
                .andExpect(jsonPath("$.data.data.notifications[0].sender.username").value("springdev"))
                .andExpect(jsonPath("$.data.data.unreadCount").value(1))
                .andExpect(jsonPath("$.data.data.requestedLimit").value(100))
                .andExpect(jsonPath("$.data.data.unreadOnly").value(true));
    }

    @Test
    void listMatchesTheLegacyParseIntFallback() throws Exception {
        mockMvc.perform(get("/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("limit", "12items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.requestedLimit").value(12));

        mockMvc.perform(get("/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("limit", "not-a-number"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.requestedLimit").value(50));
    }

    @Test
    void oneNotificationKeepsItsExistingShape() throws Exception {
        mockMvc.perform(get("/notifications/{id}", NOTIFICATION_ID)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(NOTIFICATION_ID.toString()))
                .andExpect(jsonPath("$.data.type").value("MENTION"))
                .andExpect(jsonPath("$.data.sender.id").value(SENDER_ID.toString()));
    }

    @Test
    void markReadSupportsSelectedIdsAndMarkAll() throws Exception {
        mockMvc.perform(put("/notifications/mark-read")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationIds\":[\"" + NOTIFICATION_ID + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.ids").value(1))
                .andExpect(jsonPath("$.data.read").value(true));

        mockMvc.perform(put("/notifications/mark-read")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ids").value(0));
    }

    @Test
    void markUnreadAcceptsTheExistingIdListContract() throws Exception {
        mockMvc.perform(put("/notifications/mark-unread")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationIds\":[\"" + NOTIFICATION_ID + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.read").value(false));
    }

    @Test
    void bulkNotificationUpdatesAreCappedAtOneHundredIds() {
        List<UUID> ids = IntStream.range(0, 101).mapToObj(ignored -> UUID.randomUUID()).toList();

        assertThat(new NotificationIdsRequest(ids).cappedIds()).hasSize(100);
    }

    @Test
    void webPushSubscriptionRoutesKeepTheirShapes() throws Exception {
        mockMvc.perform(get("/notifications/push-subscription")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscribed").value(true))
                .andExpect(jsonPath("$.data.subscription.endpoint").value("https://push.example/subscription"))
                .andExpect(jsonPath("$.data.mobileDevices").value(1));

        mockMvc.perform(post("/notifications/push-subscription")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"endpoint":"https://push.example/new","keys":{"p256dh":"key","auth":"secret"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscribed").value(true));

        mockMvc.perform(delete("/notifications/push-subscription")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscribed").value(false));
    }

    @Test
    void malformedWebPushSubscriptionsUseTheCompatibilityErrorEnvelope() throws Exception {
        mockMvc.perform(post("/notifications/push-subscription")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endpoint\":\"https://push.example/new\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    void mobilePushTokensCanBeRegisteredAndRemoved() throws Exception {
        String body = "{\"token\":\"ExpoPushToken[device-1]\"}";
        mockMvc.perform(post("/notifications/mobile-push-token")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.registered").value(true));

        mockMvc.perform(delete("/notifications/mobile-push-token")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.registered").value(false));
    }

    @Test
    void invalidMobilePushTokensAreRejected() throws Exception {
        mockMvc.perform(post("/notifications/mobile-push-token")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"not-an-expo-token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error[0]").value("Invalid Expo push token"));
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
        Notifications notifications() {
            return new FakeNotifications();
        }
    }

    private static class FakeNotifications implements Notifications {
        @Override
        public Map<String, Object> get(UUID userId, UUID notificationId) {
            return notification();
        }

        @Override
        public Map<String, Object> list(UUID userId, int limit, boolean unreadOnly) {
            return Map.of("success", true, "data", Map.of(
                    "notifications", List.of(notification()),
                    "unreadCount", 1,
                    "requestedLimit", limit,
                    "unreadOnly", unreadOnly
            ));
        }

        @Override
        public Map<String, Object> mark(UUID userId, List<UUID> notificationIds, boolean read) {
            return Map.of("success", true, "ids", notificationIds.size(), "read", read);
        }

        @Override
        public Map<String, Object> pushSubscription(UUID userId) {
            return Map.of(
                    "subscribed", true,
                    "subscription", Map.of("endpoint", "https://push.example/subscription"),
                    "configured", true,
                    "mobileDevices", 1
            );
        }

        @Override
        public Map<String, Object> savePushSubscription(UUID userId, PushSubscriptionRequest request) {
            return Map.of("subscribed", true, "configured", true);
        }

        @Override
        public Map<String, Object> removePushSubscription(UUID userId) {
            return Map.of("subscribed", false);
        }

        @Override
        public Map<String, Object> registerMobilePushToken(UUID userId, String token) {
            return Map.of("registered", true);
        }

        @Override
        public Map<String, Object> removeMobilePushToken(UUID userId, String token) {
            return Map.of("registered", false);
        }

        private Map<String, Object> notification() {
            return Map.of(
                    "id", NOTIFICATION_ID,
                    "type", "MENTION",
                    "title", "You were mentioned",
                    "message", "springdev mentioned you",
                    "read", false,
                    "sender", Map.of("id", SENDER_ID, "username", "springdev", "level", 4)
            );
        }
    }
}
