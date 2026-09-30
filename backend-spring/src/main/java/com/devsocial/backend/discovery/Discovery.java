package com.devsocial.backend.discovery;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Query seam for cross-entity search and trending rankings. */
public interface Discovery {
    Map<String, Object> search(String query, String type, int page, int limit, Optional<UUID> viewerId);
    Map<String, Object> trending(String period, Optional<UUID> viewerId);
}
