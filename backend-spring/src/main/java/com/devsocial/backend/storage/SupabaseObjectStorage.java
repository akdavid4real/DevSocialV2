package com.devsocial.backend.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class SupabaseObjectStorage implements ObjectStorage {
    private final RestClient restClient;
    private final String supabaseUrl;
    private final String serviceRoleKey;

    public SupabaseObjectStorage(
            RestClient.Builder restClientBuilder,
            @Value("${SUPABASE_URL:}") String supabaseUrl,
            @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String serviceRoleKey
    ) {
        this.restClient = restClientBuilder.build();
        this.supabaseUrl = supabaseUrl.endsWith("/")
                ? supabaseUrl.substring(0, supabaseUrl.length() - 1)
                : supabaseUrl;
        this.serviceRoleKey = serviceRoleKey;
    }

    @Override
    public String put(String bucket, String objectKey, String mimeType, byte[] content) {
        requireConfiguration();
        try {
            restClient.post()
                    .uri(objectUri(bucket, objectKey))
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("x-upsert", "false")
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(content)
                    .retrieve()
                    .toBodilessEntity();
            return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + objectKey;
        } catch (RestClientException | IllegalArgumentException exception) {
            throw new IllegalStateException("Supabase object upload failed", exception);
        }
    }

    @Override
    public void delete(String bucket, String objectKey) {
        requireConfiguration();
        try {
            restClient.delete()
                    .uri(objectUri(bucket, objectKey))
                    .header("apikey", serviceRoleKey)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new IllegalStateException("Supabase object deletion failed", exception);
        }
    }

    private String objectUri(String bucket, String objectKey) {
        return supabaseUrl + "/storage/v1/object/" + bucket + "/" + objectKey;
    }

    private void requireConfiguration() {
        if (supabaseUrl.isBlank() || serviceRoleKey.isBlank()) {
            throw new IllegalStateException("Supabase storage is not configured");
        }
    }
}
