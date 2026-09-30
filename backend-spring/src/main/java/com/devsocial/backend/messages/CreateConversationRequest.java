package com.devsocial.backend.messages;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateConversationRequest(
        @NotNull(message = "participantId must be a UUID")
        UUID participantId
) {
}
