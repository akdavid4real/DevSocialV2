package com.devsocial.backend.auth;

import java.util.Optional;
import java.util.UUID;

public interface SessionUserRepository {
    Optional<String> findEmailByUsername(String username);
    Optional<SessionUser> findBySupabaseUserId(UUID supabaseUserId);
    void recordLogin(UUID userId);
    void recordActivity(UUID userId);
}
