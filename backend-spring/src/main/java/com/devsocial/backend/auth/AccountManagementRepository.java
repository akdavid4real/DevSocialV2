package com.devsocial.backend.auth;

import java.util.Optional;
import java.util.UUID;

public interface AccountManagementRepository {
    boolean emailExists(String email);
    void markVerified(UUID supabaseUserId);
    Optional<AccountCredentials> findCredentials(UUID userId);
    void deleteUser(UUID userId);
}
