package com.devsocial.backend.discovery;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
public class DiscoveryController {
    private final Discovery discovery;

    public DiscoveryController(Discovery discovery) {
        this.discovery = discovery;
    }

    @GetMapping("/search")
    Map<String, Object> search(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safeLimit = limit == null || limit < 1 ? 20 : Math.min(limit, 50);
        return discovery.search(query, type == null ? "all" : type, safePage, safeLimit, userId(principal));
    }

    @GetMapping("/trending")
    Map<String, Object> trending(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) String period
    ) {
        return discovery.trending(period == null ? "today" : period, userId(principal));
    }

    private Optional<UUID> userId(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : Optional.of(principal.userId());
    }
}
