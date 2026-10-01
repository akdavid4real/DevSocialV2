package com.devsocial.backend.admin;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/admin/users")
public class AdminUsersController {
    private final AdminUsers users;

    public AdminUsersController(AdminUsers users) {
        this.users = users;
    }

    @GetMapping
    Map<String, Object> findAll(@AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) int limit,
            @RequestParam(required = false) String search) {
        return users.findAll(principal.userId(), page, limit, search);
    }

    @GetMapping("/{userId}")
    Map<String, Object> findOne(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId) {
        return users.findOne(principal.userId(), userId);
    }
}
