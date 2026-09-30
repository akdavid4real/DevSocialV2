package com.devsocial.backend.storage;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class JdbcAssetMetadata implements AssetMetadata {
    private final JdbcClient jdbc;

    public JdbcAssetMetadata(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public UUID record(
            UUID ownerId,
            String bucket,
            String objectKey,
            String publicUrl,
            String mimeType,
            int size
    ) {
        return jdbc.sql("""
                        INSERT INTO public.assets
                            (owner_id, provider, bucket, object_key, public_url, mime_type, size_bytes, status)
                        VALUES (:ownerId, 'SUPABASE', :bucket, :objectKey, :publicUrl, :mimeType, :size, 'UPLOADED')
                        RETURNING id
                        """)
                .param("ownerId", ownerId)
                .param("bucket", bucket)
                .param("objectKey", objectKey)
                .param("publicUrl", publicUrl)
                .param("mimeType", mimeType)
                .param("size", size)
                .query(UUID.class)
                .single();
    }
}
