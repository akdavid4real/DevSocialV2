package com.devsocial.backend.notifications;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MobilePushTokenRequest(
        @NotBlank(message = "token must be a string")
        @Pattern(
                regexp = "^(ExponentPushToken|ExpoPushToken)\\[[^\\]]+\\]$",
                message = "Invalid Expo push token"
        )
        String token
) {
}
