package com.devsocial.backend.auth;

import java.util.UUID;

public record AccountCredentials(UUID supabaseUserId, String email) {
}
