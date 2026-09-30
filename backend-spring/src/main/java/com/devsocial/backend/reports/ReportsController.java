package com.devsocial.backend.reports;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/reports")
public class ReportsController {
    private final ReportSubmission reports;

    public ReportsController(ReportSubmission reports) {
        this.reports = reports;
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody CreateReportRequest request) {
        return reports.create(principal.userId(), request);
    }
}
