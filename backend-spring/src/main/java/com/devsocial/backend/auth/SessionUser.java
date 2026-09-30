package com.devsocial.backend.auth;

import java.util.Map;
import java.util.UUID;

public record SessionUser(UUID id, boolean blocked, Map<String, Object> profile) {
}
