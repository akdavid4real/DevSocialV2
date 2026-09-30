package com.devsocial.backend.admin;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JdbcAdminAnalyticsRoleTest {
    @Test
    void roleMatrixIsCaseInsensitiveAndDenyByDefault() {
        Set<String> overview = Set.of("ADMIN", "MODERATOR", "ANALYTICS");
        Set<String> analytics = Set.of("ADMIN", "ANALYTICS");

        assertThat(JdbcAdminAnalytics.roleAllowed("moderator", overview)).isTrue();
        assertThat(JdbcAdminAnalytics.roleAllowed("MODERATOR", analytics)).isFalse();
        assertThat(JdbcAdminAnalytics.roleAllowed("ADMIN", analytics)).isTrue();
        assertThat(JdbcAdminAnalytics.roleAllowed("USER", overview)).isFalse();
        assertThat(JdbcAdminAnalytics.roleAllowed(null, overview)).isFalse();
    }
}
