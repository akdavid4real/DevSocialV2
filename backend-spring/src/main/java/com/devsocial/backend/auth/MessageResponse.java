package com.devsocial.backend.auth;

public record MessageResponse(boolean success, String message) {
    public static MessageResponse of(String message) {
        return new MessageResponse(true, message);
    }
}
