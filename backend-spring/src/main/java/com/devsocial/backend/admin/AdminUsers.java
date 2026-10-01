package com.devsocial.backend.admin;

import java.util.Map;
import java.util.UUID;

interface AdminUsers {
    Map<String, Object> findAll(UUID actorId, int page, int limit, String search);

    Map<String, Object> findOne(UUID actorId, UUID userId);
}
