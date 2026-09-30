package com.devsocial.backend.knowledge;

import java.util.Map;
import java.util.UUID;

/** Public knowledge catalog with authenticated publishing. */
public interface KnowledgeBank {
    Map<String, Object> findAll(int page, int limit, String technology, String category, String search);
    Map<String, Object> create(UUID userId, CreateKnowledgeEntryRequest request);
    Map<String, Object> findOne(UUID entryId);
}
