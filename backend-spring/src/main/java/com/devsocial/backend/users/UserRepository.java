package com.devsocial.backend.users;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
    Optional<Map<String, Object>> findFull(UUID userId);
    Optional<Map<String, Object>> findPublicByUsername(String username);
    Optional<Map<String, Object>> findOnboarding(UUID userId);
    Map<String, Object> updateFields(UUID userId, Map<String, Object> fields);
    List<Map<String, Object>> search(String query, int limit);
    List<Map<String, Object>> leaderboard(String period, int limit);
    Map<String, Object> readJsonSettings(UUID userId, String field);
    void writeJsonSettings(UUID userId, String field, Map<String, Object> settings);
}
