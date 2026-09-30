package com.devsocial.backend.storage;

import java.util.UUID;

/** Stores one validated upload and records its ownership atomically from the caller's perspective. */
public interface AssetUpload {
    StoredAsset store(UUID ownerId, byte[] content);
}
