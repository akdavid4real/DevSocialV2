package com.devsocial.backend.admin;

import java.util.Map;
import java.util.UUID;

/** Staff report review workflow, including moderation side effects and audit records. */
public interface AdminReports {
    Map<String, Object> findAll(UUID actorId, String status, int page, int limit);
    Map<String, Object> findOne(UUID actorId, UUID reportId);
    Map<String, Object> resolve(UUID actorId, UUID reportId, ResolveAdminReportRequest request);
}
