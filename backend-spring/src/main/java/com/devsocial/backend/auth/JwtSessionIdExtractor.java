package com.devsocial.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtSessionIdExtractor {

    private final ObjectMapper objectMapper;

    public JwtSessionIdExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    Optional<UUID> extract(String accessToken) {
        return payload(accessToken).flatMap(payload -> {
            String sessionId = payload.path("session_id").asText(null);
            try {
                return sessionId == null ? Optional.empty() : Optional.of(UUID.fromString(sessionId));
            } catch (IllegalArgumentException exception) {
                return Optional.empty();
            }
        });
    }

    Optional<Instant> expiresAt(String accessToken) {
        return payload(accessToken)
                .filter(payload -> payload.path("exp").canConvertToLong())
                .map(payload -> Instant.ofEpochSecond(payload.path("exp").asLong()));
    }

    private Optional<JsonNode> payload(String accessToken) {
        try {
            String[] parts = accessToken.split("\\.");
            if (parts.length < 2) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1])));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }
}
