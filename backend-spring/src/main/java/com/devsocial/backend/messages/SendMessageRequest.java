package com.devsocial.backend.messages;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendMessageRequest(
        @NotNull(message = "receiverId must be a UUID")
        UUID receiverId,
        @NotEmpty(message = "content should not be empty")
        String content
) {
}
