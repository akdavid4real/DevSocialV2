package com.devsocial.backend.storage;

public interface ObjectStorage {
    String put(String bucket, String objectKey, String mimeType, byte[] content);
    void delete(String bucket, String objectKey);
}
