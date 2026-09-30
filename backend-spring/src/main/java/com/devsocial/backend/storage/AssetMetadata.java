package com.devsocial.backend.storage;

import java.util.UUID;

public interface AssetMetadata {
    UUID record(UUID ownerId, String bucket, String objectKey, String publicUrl, String mimeType, int size);
}
