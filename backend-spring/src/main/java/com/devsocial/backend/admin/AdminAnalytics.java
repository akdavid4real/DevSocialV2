package com.devsocial.backend.admin;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Role-aware read model for the web administration and analytics consoles. */
public interface AdminAnalytics {
    Map<String, Object> dashboard(UUID actorId);
    List<Map<String, Object>> userGrowth(UUID actorId, int days);
    Map<String, Object> aiLogs(UUID actorId, int page, int limit, String service, String taskType);
}
