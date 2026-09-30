package com.devsocial.backend.auth;

import java.util.Map;
import java.util.UUID;

public interface SupabaseRegistrationGateway {
    UUID signUp(String email, String password, Map<String, Object> metadata);
}
