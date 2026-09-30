package com.devsocial.backend.notifications;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
public class NotificationsController {
    private static final Pattern INTEGER_PREFIX = Pattern.compile("^\\s*([+-]?\\d+)");
    private final Notifications notifications;

    public NotificationsController(Notifications notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/notifications/push-subscription")
    Map<String, Object> pushSubscription(@AuthenticationPrincipal AuthenticatedUser principal) {
        return notifications.pushSubscription(principal.userId());
    }

    @PostMapping("/notifications/push-subscription")
    Map<String, Object> savePushSubscription(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody PushSubscriptionRequest request
    ) {
        return notifications.savePushSubscription(principal.userId(), request);
    }

    @DeleteMapping("/notifications/push-subscription")
    Map<String, Object> removePushSubscription(@AuthenticationPrincipal AuthenticatedUser principal) {
        return notifications.removePushSubscription(principal.userId());
    }

    @PostMapping("/notifications/mobile-push-token")
    Map<String, Object> registerMobilePushToken(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MobilePushTokenRequest request
    ) {
        return notifications.registerMobilePushToken(principal.userId(), request.token());
    }

    @DeleteMapping("/notifications/mobile-push-token")
    Map<String, Object> removeMobilePushToken(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody MobilePushTokenRequest request
    ) {
        return notifications.removeMobilePushToken(principal.userId(), request.token());
    }

    @GetMapping("/notifications/{notificationId}")
    Map<String, Object> notification(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID notificationId
    ) {
        return notifications.get(principal.userId(), notificationId);
    }

    @GetMapping("/notifications")
    Map<String, Object> notifications(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) String limit,
            @RequestParam(required = false) String unread
    ) {
        int safeLimit = parseLimit(limit);
        return notifications.list(principal.userId(), safeLimit, "true".equals(unread));
    }

    @PutMapping("/notifications/mark-read")
    Map<String, Object> markRead(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody(required = false) NotificationIdsRequest request
    ) {
        return notifications.mark(principal.userId(), request == null ? java.util.List.of() : request.cappedIds(), true);
    }

    @PutMapping("/notifications/mark-unread")
    Map<String, Object> markUnread(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestBody(required = false) NotificationIdsRequest request
    ) {
        return notifications.mark(principal.userId(), request == null ? java.util.List.of() : request.cappedIds(), false);
    }

    private int parseLimit(String value) {
        if (value == null) return 50;
        Matcher matcher = INTEGER_PREFIX.matcher(value);
        if (!matcher.find()) return 50;
        try {
            BigInteger parsed = new BigInteger(matcher.group(1));
            if (parsed.compareTo(BigInteger.ONE) < 0) return 1;
            if (parsed.compareTo(BigInteger.valueOf(100)) > 0) return 100;
            return parsed.intValue();
        } catch (NumberFormatException exception) {
            return 50;
        }
    }
}
