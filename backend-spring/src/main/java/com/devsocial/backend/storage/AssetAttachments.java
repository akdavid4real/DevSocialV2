package com.devsocial.backend.storage;

import java.util.List;
import java.util.UUID;

public interface AssetAttachments {
    void attach(UUID ownerId, List<String> urls, String targetType, UUID targetId);
    void detach(String targetType, UUID targetId);
}
