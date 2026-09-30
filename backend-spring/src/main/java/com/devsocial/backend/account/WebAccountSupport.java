package com.devsocial.backend.account;

import java.util.Map;
import java.util.UUID;

public interface WebAccountSupport {
    Map<String, Object> affiliations();

    Map<String, Object> securityStats(UUID userId);

    Map<String, Object> exportData(UUID userId);
}
