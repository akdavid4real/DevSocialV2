package com.devsocial.backend.admin;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
class AdminRolePolicy {
    static final Set<String> ADMIN_ONLY = Set.of("ADMIN");
    static final Set<String> ADMIN_OR_MODERATOR = Set.of("ADMIN", "MODERATOR");
    static final Set<String> ADMIN_OR_ANALYTICS = Set.of("ADMIN", "ANALYTICS");
    static final Set<String> STAFF_OR_ANALYTICS = Set.of("ADMIN", "MODERATOR", "ANALYTICS");

    private final JdbcClient jdbc;

    AdminRolePolicy(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    void require(UUID actorId, Set<String> allowed) {
        String role = jdbc.sql("SELECT role::text FROM \"User\" WHERE id = :id")
                .param("id", actorId).query(String.class).optional().orElse(null);
        if (!roleAllowed(role, allowed))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
    }

    static boolean roleAllowed(String role, Set<String> allowed) {
        return role != null && allowed.contains(role.toUpperCase(Locale.ROOT));
    }
}
