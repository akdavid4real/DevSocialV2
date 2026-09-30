package com.devsocial.backend.storage;

public class UploadRejectedException extends RuntimeException {
    public UploadRejectedException(String message) {
        super(message);
    }
}
