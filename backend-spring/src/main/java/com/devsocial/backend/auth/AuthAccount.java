package com.devsocial.backend.auth;

import java.util.UUID;

public record AuthAccount(UUID id, boolean blocked) {
}

