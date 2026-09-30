package com.devsocial.backend.configuration;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DatabaseConfiguration {

    @Bean
    DataSource dataSource(
            @Value("${DATABASE_URL:}") String databaseUrl,
            @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/devsocial}") String fallbackUrl,
            @Value("${spring.datasource.username:postgres}") String fallbackUsername,
            @Value("${spring.datasource.password:postgres}") String fallbackPassword
    ) {
        ConnectionDetails details = databaseUrl.isBlank()
                ? new ConnectionDetails(fallbackUrl, fallbackUsername, fallbackPassword)
                : parseDatabaseUrl(databaseUrl);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(details.jdbcUrl());
        config.setUsername(details.username());
        config.setPassword(details.password());
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30_000);
        config.setIdleTimeout(10_000);
        config.setPoolName("devsocial-postgres");
        return new HikariDataSource(config);
    }

    static ConnectionDetails parseDatabaseUrl(String value) {
        if (value.startsWith("jdbc:")) {
            return new ConnectionDetails(value, "", "");
        }

        URI uri = URI.create(value);
        String[] credentials = uri.getUserInfo() == null ? new String[]{"", ""} : uri.getUserInfo().split(":", 2);
        String username = decode(credentials[0]);
        String password = credentials.length > 1 ? decode(credentials[1]) : "";
        int port = uri.getPort() < 0 ? 5432 : uri.getPort();
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getPath() + query;
        return new ConnectionDetails(jdbcUrl, username, password);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    record ConnectionDetails(String jdbcUrl, String username, String password) {
    }
}

