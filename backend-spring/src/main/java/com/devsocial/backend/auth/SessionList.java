package com.devsocial.backend.auth;

import java.time.Instant;
import java.util.List;

public record SessionList(List<Session> sessions, boolean supportsIndividualSessionListing) {
    public record Session(String id, Instant lastActive, Instant expiresAt, boolean isCurrent) {
    }
}
