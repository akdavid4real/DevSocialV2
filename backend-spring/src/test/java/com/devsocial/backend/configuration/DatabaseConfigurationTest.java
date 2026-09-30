package com.devsocial.backend.configuration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseConfigurationTest {

    @Test
    void translatesExistingPostgresUrlToJdbcConfiguration() {
        var details = DatabaseConfiguration.parseDatabaseUrl(
                "postgresql://devsocial:p%40ss@db.example.com:6543/app?sslmode=require"
        );

        assertThat(details.jdbcUrl())
                .isEqualTo("jdbc:postgresql://db.example.com:6543/app?sslmode=require");
        assertThat(details.username()).isEqualTo("devsocial");
        assertThat(details.password()).isEqualTo("p@ss");
    }
}

