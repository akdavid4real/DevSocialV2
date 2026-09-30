package com.devsocial.backend.storage;

public class UploadFailedException extends RuntimeException {
    public UploadFailedException(Throwable cause) {
        super("Upload failed", cause);
    }
}
