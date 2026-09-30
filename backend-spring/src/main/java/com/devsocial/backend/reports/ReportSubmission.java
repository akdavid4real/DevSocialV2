package com.devsocial.backend.reports;

import java.util.Map;
import java.util.UUID;

/** Validated, duplicate-safe report submission seam. */
public interface ReportSubmission {
    Map<String, Object> create(UUID reporterId, CreateReportRequest request);
}
