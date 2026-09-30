package com.devsocial.backend.messages;

import jakarta.validation.constraints.Size;

public record MessageReactionRequest(
        @Size(max = 16, message = "emoji must be shorter than or equal to 16 characters")
        String emoji
) {
}
