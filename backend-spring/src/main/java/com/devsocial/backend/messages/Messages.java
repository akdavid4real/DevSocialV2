package com.devsocial.backend.messages;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface Messages {
    Map<String, Object> send(UUID userId, SendMessageRequest request);

    Map<String, Object> getOrCreateConversation(UUID userId, UUID participantId);

    List<Map<String, Object>> conversations(UUID userId);

    long unreadCount(UUID userId);

    List<Map<String, Object>> messages(UUID userId, UUID conversationId, int limit, String before);

    Map<String, Object> markRead(UUID userId, UUID conversationId);

    Map<String, Object> addReaction(UUID userId, UUID conversationId, UUID messageId, String emoji);

    Map<String, Object> removeReaction(UUID userId, UUID conversationId, UUID messageId, String emoji);
}
