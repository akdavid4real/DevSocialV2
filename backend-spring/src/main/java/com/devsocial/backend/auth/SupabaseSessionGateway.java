package com.devsocial.backend.auth;

public interface SupabaseSessionGateway {
    SupabaseSession signIn(String email, String password);
    SupabaseSession refresh(String refreshToken);
}
