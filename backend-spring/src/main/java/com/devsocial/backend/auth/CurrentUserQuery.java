package com.devsocial.backend.auth;

import org.springframework.stereotype.Component;

@Component
public class CurrentUserQuery {

    private final CurrentUserRepository users;

    public CurrentUserQuery(CurrentUserRepository users) {
        this.users = users;
    }

    public CurrentUser get(AuthenticatedUser principal) {
        return users.findById(principal.userId())
                .orElseThrow(() -> new InvalidAccessTokenException("User not found"));
    }
}

