package com.devsocial.backend.common.http;

import java.time.Instant;

public record ApiError(
        boolean success,
        int statusCode,
        Instant timestamp,
        String path,
        Object error
) {
    public static ApiError of(int statusCode, String path, Object error) {
        return new ApiError(false, statusCode, Instant.now(), path, error);
    }
}

