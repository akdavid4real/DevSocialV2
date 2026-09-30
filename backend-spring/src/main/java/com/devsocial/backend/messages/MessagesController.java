package com.devsocial.backend.messages;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
public class MessagesController {
    private static final Pattern INTEGER_PREFIX = Pattern.compile("^\\s*([+-]?\\d+)");

    private final Messages messages;

    public MessagesController(Messages messages) {
        this.messages = messages;
    }

    @PostMapping("/messages")
    Map<String, Object> send(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return messages.send(principal.userId(), request);
    }

    @PostMapping("/messages/conversations")
    Map<String, Object> createConversation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateConversationRequest request
    ) {
        return messages.getOrCreateConversation(principal.userId(), request.participantId());
    }

    @GetMapping("/messages/conversations")
    List<Map<String, Object>> conversations(@AuthenticationPrincipal AuthenticatedUser principal) {
        return messages.conversations(principal.userId());
    }

    @GetMapping("/messages/unread-count")
    long unreadCount(@AuthenticationPrincipal AuthenticatedUser principal) {
        return messages.unreadCount(principal.userId());
    }

    @GetMapping("/messages/{conversationId}")
    List<Map<String, Object>> messages(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @RequestParam(required = false) String limit,
            @RequestParam(required = false) String before
    ) {
        return messages.messages(principal.userId(), conversationId, parseLimit(limit), before);
    }

    @PatchMapping("/messages/{conversationId}/read")
    Map<String, Object> markRead(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId
    ) {
        return messages.markRead(principal.userId(), conversationId);
    }

    @PostMapping("/messages/{conversationId}/{messageId}/reactions")
    Map<String, Object> addReaction(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @PathVariable UUID messageId,
            @Valid @RequestBody MessageReactionRequest request
    ) {
        return messages.addReaction(principal.userId(), conversationId, messageId, request.emoji());
    }

    @DeleteMapping("/messages/{conversationId}/{messageId}/reactions")
    Map<String, Object> removeReaction(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @PathVariable UUID messageId,
            @Valid @RequestBody(required = false) MessageReactionRequest request
    ) {
        return messages.removeReaction(
                principal.userId(),
                conversationId,
                messageId,
                request == null ? null : request.emoji()
        );
    }

    private int parseLimit(String value) {
        if (value == null) return 50;
        Matcher matcher = INTEGER_PREFIX.matcher(value);
        if (!matcher.find()) return 50;
        try {
            BigInteger parsed = new BigInteger(matcher.group(1));
            if (parsed.signum() == 0) return 50;
            if (parsed.compareTo(BigInteger.ONE) < 0) return 1;
            if (parsed.compareTo(BigInteger.valueOf(100)) > 0) return 100;
            return parsed.intValue();
        } catch (NumberFormatException exception) {
            return 50;
        }
    }
}
