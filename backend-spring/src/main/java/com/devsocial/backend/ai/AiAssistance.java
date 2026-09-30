package com.devsocial.backend.ai;

import java.util.Map;
import java.util.UUID;

/** Deterministic web writing assistance with atomic per-user quota consumption. */
public interface AiAssistance {
    Map<String, Object> summarize(UUID userId, String content);
    Map<String, Object> explain(UUID userId, String content);
    Map<String, Object> enhance(UUID userId, String content, String action);
}
