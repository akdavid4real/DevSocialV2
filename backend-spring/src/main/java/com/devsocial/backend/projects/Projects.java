package com.devsocial.backend.projects;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Web-project workflow seam, including ownership and daily unique-view invariants. */
public interface Projects {
    Map<String, Object> findAll(int page, int limit, String search, String status, String technology);
    Map<String, Object> findMine(UUID userId, int page, int limit, String status);
    Map<String, Object> create(UUID userId, CreateProjectRequest request);
    Map<String, Object> findOne(UUID projectId, Optional<UUID> viewerId, String visitorKey);
    Map<String, Object> updateStatus(UUID userId, UUID projectId, String status);
    Map<String, Object> remove(UUID userId, UUID projectId);
}
