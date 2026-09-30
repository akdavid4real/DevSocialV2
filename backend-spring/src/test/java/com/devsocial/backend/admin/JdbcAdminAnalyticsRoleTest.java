package com.devsocial.backend.admin;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JdbcAdminAnalyticsRoleTest {
    @Test
    void roleMatrixIsCaseInsensitiveAndDenyByDefault() {
        Set<String> overview = Set.of("ADMIN", "MODERATOR", "ANALYTICS");
        Set<String> analytics = Set.of("ADMIN", "ANALYTICS");

        assertThat(AdminRolePolicy.roleAllowed("moderator", overview)).isTrue();
        assertThat(AdminRolePolicy.roleAllowed("MODERATOR", analytics)).isFalse();
        assertThat(AdminRolePolicy.roleAllowed("ADMIN", analytics)).isTrue();
        assertThat(AdminRolePolicy.roleAllowed("USER", overview)).isFalse();
        assertThat(AdminRolePolicy.roleAllowed(null, overview)).isFalse();
    }
}
