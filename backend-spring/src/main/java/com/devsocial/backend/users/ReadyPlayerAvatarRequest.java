package com.devsocial.backend.users;

import jakarta.validation.constraints.NotBlank;

public record ReadyPlayerAvatarRequest(@NotBlank String avatarUrl) {
}
