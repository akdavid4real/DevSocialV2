package com.devsocial.backend.account;

import java.util.Map;
import java.util.UUID;

public interface WebAccountSupport {
    Map<String, Object> affiliations();

    Map<String, Object> securityStats(UUID userId);

    Map<String, Object> aiUsage(UUID userId);

    Map<String, Object> dashboard(UUID userId, String period);

    Map<String, Object> exportData(UUID userId);
}
