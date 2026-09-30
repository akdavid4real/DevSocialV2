package com.devsocial.backend.auth;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CurrentUser(
        UUID id,
        String email,
        String username,
        String firstName,
        String lastName,
        String displayName,
        String bio,
        String avatar,
        String bannerUrl,
        String role,
        String affiliation,
        String techCareerPath,
        List<String> techStack,
        String experienceLevel,
        String githubUsername,
        String linkedinUrl,
        String portfolioUrl,
        String location,
        String website,
        List<String> interests,
        int points,
        int level,
        List<String> badges,
        int loginStreak,
        Instant lastStreakDate,
        int followersCount,
        int followingCount,
        boolean isVerified,
        boolean onboardingCompleted,
        Instant createdAt,
        Instant updatedAt
) {
}

