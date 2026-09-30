package com.devsocial.backend.notifications;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PushSubscriptionRequest(
        @NotBlank(message = "endpoint must be a string")
        String endpoint,
        @Valid
        @NotNull(message = "keys must be an object")
        Keys keys
) {
    public record Keys(
            @NotBlank(message = "p256dh must be a string")
            String p256dh,
            @NotBlank(message = "auth must be a string")
            String auth
    ) {
    }
}
