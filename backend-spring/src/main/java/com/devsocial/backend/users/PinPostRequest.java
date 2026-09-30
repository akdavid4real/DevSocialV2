package com.devsocial.backend.users;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PinPostRequest(
        @NotNull(message = "postId must be a UUID")
        UUID postId
) {
}
