package com.devsocial.backend.storage;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Repository
public class JdbcAssetAttachments implements AssetAttachments {
    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    public JdbcAssetAttachments(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public void attach(UUID ownerId, List<String> urls, String targetType, UUID targetId) {
        List<String> uniqueUrls = new LinkedHashSet<>(urls).stream()
                .filter(value -> value != null && !value.isBlank())
                .toList();
        if (uniqueUrls.isEmpty()) return;
        jdbc.sql("""
                        UPDATE public.assets
                        SET status = 'ATTACHED', attached_to_type = :targetType,
                            attached_to_id = :targetId, attached_at = COALESCE(attached_at, now())
                        WHERE owner_id = :ownerId
                          AND public_url = ANY(ARRAY(
                              SELECT jsonb_array_elements_text(CAST(:urls AS jsonb))
                          ))
                          AND status <> 'DELETED'
                        """)
                .param("targetType", targetType)
                .param("targetId", targetId)
                .param("ownerId", ownerId)
                .param("urls", json(uniqueUrls))
                .update();
    }

    @Override
    public void detach(String targetType, UUID targetId) {
        jdbc.sql("""
                        UPDATE public.assets
                        SET status = 'UPLOADED', attached_to_type = NULL,
                            attached_to_id = NULL, attached_at = NULL
                        WHERE attached_to_type = :targetType
                          AND attached_to_id = :targetId AND status = 'ATTACHED'
                        """)
                .param("targetType", targetType)
                .param("targetId", targetId)
                .update();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Asset URLs cannot be encoded", exception);
        }
    }
}
