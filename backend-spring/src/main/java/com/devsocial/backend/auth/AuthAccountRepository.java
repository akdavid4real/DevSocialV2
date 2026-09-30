package com.devsocial.backend.auth;

import java.util.Optional;
import java.util.UUID;

public interface AuthAccountRepository {

    boolean isSessionActive(UUID sessionId, UUID supabaseUserId);

    Optional<AuthAccount> findBySupabaseUserId(UUID supabaseUserId);
}

