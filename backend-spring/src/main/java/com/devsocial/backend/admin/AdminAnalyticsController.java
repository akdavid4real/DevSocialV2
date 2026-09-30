package com.devsocial.backend.admin;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/admin")
public class AdminAnalyticsController {
    private final AdminAnalytics analytics;

    public AdminAnalyticsController(AdminAnalytics analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/dashboard/stats")
    Map<String, Object> dashboard(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return analytics.dashboard(principal.userId());
    }

    @GetMapping("/dashboard/user-growth")
    List<Map<String, Object>> userGrowth(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "30") int days) {
        return analytics.userGrowth(principal.userId(), days == 0 ? 30 : days);
    }

    @GetMapping("/ai-logs")
    Map<String, Object> aiLogs(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "50") @Min(1) int limit,
            @RequestParam(required = false) @Pattern(regexp = "MISTRAL|GEMINI") String service,
            @RequestParam(required = false) String taskType) {
        return analytics.aiLogs(principal.userId(), page, limit, service, taskType);
    }
}
