package com.devsocial.backend.notifications;

import java.util.List;
import java.util.UUID;

public record NotificationIdsRequest(List<UUID> notificationIds) {
    List<UUID> cappedIds() {
        return notificationIds == null ? List.of() : notificationIds.stream().limit(100).toList();
    }
}
