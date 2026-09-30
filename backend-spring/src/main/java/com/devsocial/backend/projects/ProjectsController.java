package com.devsocial.backend.projects;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/projects")
public class ProjectsController {
    private final Projects projects;

    public ProjectsController(Projects projects) {
        this.projects = projects;
    }

    @GetMapping
    Map<String, Object> findAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "tech") String technology
    ) {
        return projects.findAll(page(page), limit(limit, 12), search, status, technology);
    }

    @GetMapping("/me")
    Map<String, Object> findMine(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String status
    ) {
        return projects.findMine(principal.userId(), page(page), limit(limit, 24), status);
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody CreateProjectRequest request) {
        return projects.create(principal.userId(), request);
    }

    @GetMapping("/{id}")
    Map<String, Object> findOne(@AuthenticationPrincipal AuthenticatedUser principal,
                                @PathVariable UUID id, HttpServletRequest request) {
        Optional<UUID> viewerId = principal == null ? Optional.empty() : Optional.of(principal.userId());
        String visitorKey = viewerId.map(value -> "user:" + value)
                .orElseGet(() -> "guest:" + sha256(request.getRemoteAddr() + "|" +
                        Optional.ofNullable(request.getHeader("User-Agent")).orElse("unknown")));
        return projects.findOne(id, viewerId, visitorKey);
    }

    @PutMapping("/{id}/status")
    Map<String, Object> updateStatus(@AuthenticationPrincipal AuthenticatedUser principal,
                                     @PathVariable UUID id,
                                     @Valid @RequestBody UpdateProjectStatusRequest request) {
        return projects.updateStatus(principal.userId(), id, request.status());
    }

    @DeleteMapping("/{id}")
    Map<String, Object> remove(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id) {
        return projects.remove(principal.userId(), id);
    }

    private int page(Integer value) {
        return value == null || value < 1 ? 1 : value;
    }

    private int limit(Integer value, int defaultValue) {
        return value == null || value < 1 ? defaultValue : Math.min(value, 50);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
