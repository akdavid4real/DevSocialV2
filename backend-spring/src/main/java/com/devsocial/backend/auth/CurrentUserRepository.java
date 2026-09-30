package com.devsocial.backend.auth;

import java.util.Optional;
import java.util.UUID;

public interface CurrentUserRepository {

    Optional<CurrentUser> findById(UUID userId);
}

