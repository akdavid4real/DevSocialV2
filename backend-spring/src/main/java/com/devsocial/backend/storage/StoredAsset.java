package com.devsocial.backend.storage;

import java.util.UUID;

public record StoredAsset(
        UUID assetId,
        String url,
        String objectKey,
        String bucket,
        String mimetype,
        int size
) {
}
