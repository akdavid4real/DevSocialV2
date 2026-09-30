package com.devsocial.backend.admin;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/admin/reports")
public class AdminReportsController {
    private final AdminReports reports;

    public AdminReportsController(AdminReports reports) {
        this.reports = reports;
    }

    @GetMapping
    Map<String, Object> findAll(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false)
            @Pattern(regexp = "PENDING|REVIEWED|RESOLVED|DISMISSED") String status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) int limit) {
        return reports.findAll(principal.userId(), status, page, limit);
    }

    @GetMapping("/{reportId}")
    Map<String, Object> findOne(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID reportId) {
        return reports.findOne(principal.userId(), reportId);
    }

    @PutMapping("/{reportId}/resolve")
    Map<String, Object> resolve(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID reportId, @Valid @RequestBody ResolveAdminReportRequest request) {
        return reports.resolve(principal.userId(), reportId, request);
    }
}
