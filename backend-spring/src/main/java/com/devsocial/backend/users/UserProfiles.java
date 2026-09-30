package com.devsocial.backend.users;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class UserProfiles {
    private static final Set<String> PROFILE_FIELDS = Set.of(
            "displayName", "bio", "avatar", "bannerUrl", "location", "website",
            "githubUsername", "linkedinUrl", "portfolioUrl", "affiliation", "techStack",
            "techCareerPath", "experienceLevel", "interests"
    );
    private static final Set<String> ONBOARDING_FIELDS = Set.of(
            "gender", "bio", "avatar", "techCareerPath", "techStack",
            "experienceLevel", "interests", "affiliation", "badges"
    );
    private static final Set<String> ARRAY_FIELDS = Set.of("techStack", "interests", "badges");
    private static final Set<String> EXPERIENCE_LEVELS = Set.of("BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT");
    private static final Set<String> GENDERS = Set.of("MALE", "FEMALE", "OTHER");
    private static final Map<String, Object> APPEARANCE_DEFAULTS = Map.of(
            "theme", "system",
            "fontSize", "medium",
            "compactMode", false,
            "highContrast", false,
            "reducedMotion", false,
            "colorTheme", "vibrant",
            "sidebarCollapsed", false,
            "showAvatars", true
    );

    private final UserRepository users;

    public UserProfiles(UserRepository users) {
        this.users = users;
    }

    public Map<String, Object> current(AuthenticatedUser principal) {
        return requireFull(principal);
    }

    public Map<String, Object> updateProfile(AuthenticatedUser principal, Map<String, Object> request) {
        return users.updateFields(principal.userId(), validateFields(request, PROFILE_FIELDS, false));
    }

    public Map<String, Object> publicProfile(String username) {
        return users.findPublicByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User @" + username + " not found"
                ));
    }

    public List<Map<String, Object>> search(String query) {
        return query == null || query.isBlank() ? List.of() : users.search(query.trim(), 20);
    }

    public Map<String, Object> leaderboard(String period, Integer requestedLimit) {
        int limit = Math.min(Math.max(requestedLimit == null ? 50 : requestedLimit, 1), 100);
        return Map.of("users", users.leaderboard(period == null ? "all" : period, limit));
    }

    public Map<String, Object> onboarding(AuthenticatedUser principal) {
        return users.findOnboarding(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public Map<String, Object> updateOnboarding(AuthenticatedUser principal, Map<String, Object> request) {
        Map<String, Object> fields = validateFields(request, ONBOARDING_FIELDS, true);
        Object interests = fields.get("interests");
        fields.put("onboardingCompleted", interests instanceof List<?> list && !list.isEmpty());
        return users.updateFields(principal.userId(), fields);
    }

    public Map<String, Object> saveReadyPlayerAvatar(
            AuthenticatedUser principal,
            ReadyPlayerAvatarRequest request
    ) {
        String avatar = normalizeReadyPlayerAvatarUrl(request.avatarUrl());
        users.updateFields(principal.userId(), Map.of("avatar", avatar));
        return Map.of(
                "success", true,
                "message", "Avatar saved successfully",
                "data", Map.of("avatarUrl", avatar)
        );
    }

    public Map<String, Object> appearance(AuthenticatedUser principal) {
        Map<String, Object> settings = new LinkedHashMap<>(APPEARANCE_DEFAULTS);
        settings.putAll(users.readJsonSettings(principal.userId(), "appearance"));
        return Map.of("data", Map.of("appearanceSettings", settings));
    }

    public Map<String, Object> updateAppearance(AuthenticatedUser principal, Map<String, Object> request) {
        validateAppearance(request);
        Map<String, Object> settings = new LinkedHashMap<>(APPEARANCE_DEFAULTS);
        settings.putAll(request);
        users.writeJsonSettings(principal.userId(), "appearance", settings);
        return Map.of(
                "success", true,
                "message", "Appearance settings updated successfully",
                "data", Map.of("appearanceSettings", settings)
        );
    }

    public Map<String, Object> privacy(AuthenticatedUser principal) {
        return Map.of("data", Map.of(
                "privacySettings", users.readJsonSettings(principal.userId(), "privacy")
        ));
    }

    public Map<String, Object> updatePrivacy(AuthenticatedUser principal, Map<String, Object> request) {
        Map<String, Object> settings = requireNestedSettings(request, "privacySettings");
        users.writeJsonSettings(principal.userId(), "privacy", settings);
        return Map.of("success", true, "message", "Privacy settings updated successfully");
    }

    public Map<String, Object> notifications(AuthenticatedUser principal) {
        return Map.of("data", Map.of(
                "notificationSettings", users.readJsonSettings(principal.userId(), "notifications")
        ));
    }

    public Map<String, Object> updateNotifications(AuthenticatedUser principal, Map<String, Object> request) {
        Map<String, Object> settings = requireNestedSettings(request, "notificationSettings");
        users.writeJsonSettings(principal.userId(), "notifications", settings);
        return Map.of("success", true, "message", "Notification settings updated successfully");
    }

    private Map<String, Object> requireFull(AuthenticatedUser principal) {
        return users.findFull(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Map<String, Object> validateFields(
            Map<String, Object> request,
            Set<String> allowed,
            boolean onboarding
    ) {
        Map<String, Object> fields = new LinkedHashMap<>();
        for (Map.Entry<String, Object> field : request.entrySet()) {
            if (!allowed.contains(field.getKey())) {
                throw badRequest("property " + field.getKey() + " should not exist");
            }
            Object value = field.getValue();
            if (value == null) {
                fields.put(field.getKey(), null);
                continue;
            }
            if (ARRAY_FIELDS.contains(field.getKey())) {
                if (!(value instanceof List<?> list) || list.stream().anyMatch(item -> !(item instanceof String))) {
                    throw badRequest(field.getKey() + " must be an array of strings");
                }
                fields.put(field.getKey(), new ArrayList<>((List<?>) value));
                continue;
            }
            if (!(value instanceof String string)) {
                throw badRequest(field.getKey() + " must be a string");
            }
            validateString(field.getKey(), string, onboarding);
            fields.put(field.getKey(), string);
        }
        return fields;
    }

    private void validateString(String key, String value, boolean onboarding) {
        int maxLength = switch (key) {
            case "displayName", "githubUsername" -> 50;
            case "bio" -> 250;
            case "location", "affiliation" -> 100;
            case "website", "linkedinUrl" -> 200;
            default -> Integer.MAX_VALUE;
        };
        if (value.length() > maxLength) {
            throw badRequest(key + " is too long");
        }
        if ((key.equals("avatar") || key.equals("bannerUrl")) && !onboarding && !isUrl(value)) {
            throw badRequest(key + " must be a URL address");
        }
        if (key.equals("experienceLevel") && !EXPERIENCE_LEVELS.contains(value)) {
            throw badRequest("experienceLevel must be a valid enum value");
        }
        if (key.equals("gender") && !GENDERS.contains(value)) {
            throw badRequest("gender must be a valid enum value");
        }
    }

    private void validateAppearance(Map<String, Object> request) {
        Set<String> allowed = APPEARANCE_DEFAULTS.keySet();
        for (Map.Entry<String, Object> entry : request.entrySet()) {
            if (!allowed.contains(entry.getKey())) {
                throw badRequest("property " + entry.getKey() + " should not exist");
            }
            if ((entry.getKey().equals("theme") && !Set.of("light", "dark", "system").contains(entry.getValue()))
                    || (entry.getKey().equals("fontSize") && !Set.of("small", "medium", "large").contains(entry.getValue()))
                    || (entry.getKey().equals("colorTheme") && !Set.of("vibrant", "classic").contains(entry.getValue()))) {
                throw badRequest(entry.getKey() + " has an invalid value");
            }
            if (!Set.of("theme", "fontSize", "colorTheme").contains(entry.getKey())
                    && !(entry.getValue() instanceof Boolean)) {
                throw badRequest(entry.getKey() + " must be a boolean value");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> requireNestedSettings(Map<String, Object> request, String key) {
        if (request.size() != 1 || !(request.get(key) instanceof Map<?, ?> settings)) {
            throw badRequest(key + " must be an object");
        }
        return new LinkedHashMap<>((Map<String, Object>) settings);
    }

    private String normalizeReadyPlayerAvatarUrl(String value) {
        String raw = value.trim().replaceAll("^[\\\"']+|[\\\"']+$", "");
        try {
            URI uri = URI.create(raw);
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (!"models.readyplayer.me".equals(uri.getHost())
                    || (!path.toLowerCase().endsWith(".glb") && !path.toLowerCase().endsWith(".png"))) {
                throw badRequest("Invalid avatar URL");
            }
            String normalizedPath = path.replaceAll("(?i)\\.glb$", ".png");
            return new URI(uri.getScheme(), uri.getAuthority(), normalizedPath, null, null).toString();
        } catch (IllegalArgumentException | java.net.URISyntaxException exception) {
            throw badRequest("Invalid avatar URL");
        }
    }

    private boolean isUrl(String value) {
        try {
            URI uri = URI.create(value);
            return uri.getScheme() != null && uri.getHost() != null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
