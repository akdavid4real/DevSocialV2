package com.devsocial.backend.account;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class WebAccountController {
    private final WebAccountSupport accounts;

    public WebAccountController(WebAccountSupport accounts) {
        this.accounts = accounts;
    }

    @GetMapping("/affiliations")
    Map<String, Object> affiliations() {
        return accounts.affiliations();
    }

    @GetMapping("/auth/security-stats")
    Map<String, Object> securityStats(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accounts.securityStats(principal.userId());
    }

    @GetMapping("/users/ai-usage")
    Map<String, Object> aiUsage(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accounts.aiUsage(principal.userId());
    }

    @PostMapping("/users/export-data")
    Map<String, Object> exportData(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accounts.exportData(principal.userId());
    }
}
