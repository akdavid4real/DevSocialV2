package com.devsocial.backend.auth;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcAccountManagementRepository implements AccountManagementRepository {
    private final JdbcClient jdbc;

    public JdbcAccountManagementRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean emailExists(String email) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM \"User\" WHERE email = :email)")
                .param("email", email).query(Boolean.class).single();
    }

    @Override
    public void markVerified(UUID supabaseUserId) {
        jdbc.sql("UPDATE \"User\" SET \"isVerified\" = TRUE WHERE \"supabaseAuthId\" = :supabaseUserId")
                .param("supabaseUserId", supabaseUserId.toString()).update();
    }

    @Override
    public Optional<AccountCredentials> findCredentials(UUID userId) {
        return jdbc.sql("SELECT \"supabaseAuthId\", email FROM \"User\" WHERE id = :userId LIMIT 1")
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new AccountCredentials(
                        UUID.fromString(resultSet.getString("supabaseAuthId")),
                        resultSet.getString("email")
                )).optional();
    }

    @Override
    public void deleteUser(UUID userId) {
        jdbc.sql("DELETE FROM \"User\" WHERE id = :userId").param("userId", userId).update();
    }
}
