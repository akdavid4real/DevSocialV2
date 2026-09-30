package com.devsocial.backend.notifications;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface Notifications {
    Map<String, Object> get(UUID userId, UUID notificationId);

    Map<String, Object> list(UUID userId, int limit, boolean unreadOnly);

    Map<String, Object> mark(UUID userId, List<UUID> notificationIds, boolean read);

    Map<String, Object> pushSubscription(UUID userId);

    Map<String, Object> savePushSubscription(UUID userId, PushSubscriptionRequest request);

    Map<String, Object> removePushSubscription(UUID userId);

    Map<String, Object> registerMobilePushToken(UUID userId, String token);

    Map<String, Object> removeMobilePushToken(UUID userId, String token);
}
