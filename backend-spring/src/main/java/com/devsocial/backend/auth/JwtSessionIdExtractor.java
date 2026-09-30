package com.devsocial.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtSessionIdExtractor {

    private final ObjectMapper objectMapper;

    public JwtSessionIdExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    Optional<UUID> extract(String accessToken) {
        try {
            String[] parts = accessToken.split("\\.");
            if (parts.length < 2) {
                return Optional.empty();
            }
            JsonNode payload = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            String sessionId = payload.path("session_id").asText(null);
            return sessionId == null ? Optional.empty() : Optional.of(UUID.fromString(sessionId));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }
}

