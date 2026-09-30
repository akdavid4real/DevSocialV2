package com.devsocial.backend.auth;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcAuthAccountRepository implements AuthAccountRepository {

    private final JdbcClient jdbc;

    public JdbcAuthAccountRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean isSessionActive(UUID sessionId, UUID supabaseUserId) {
        return jdbc.sql("""
                        SELECT EXISTS (
                            SELECT 1
                            FROM auth.sessions
                            WHERE id = :sessionId
                              AND user_id = :supabaseUserId
                        )
                        """)
                .param("sessionId", sessionId)
                .param("supabaseUserId", supabaseUserId)
                .query(Boolean.class)
                .single();
    }

    @Override
    public Optional<AuthAccount> findBySupabaseUserId(UUID supabaseUserId) {
        return jdbc.sql("""
                        SELECT id, "isBlocked"
                        FROM "User"
                        WHERE "supabaseAuthId" = :supabaseUserId
                        LIMIT 1
                        """)
                .param("supabaseUserId", supabaseUserId.toString())
                .query((resultSet, rowNumber) -> new AuthAccount(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getBoolean("isBlocked")
                ))
                .optional();
    }
}

