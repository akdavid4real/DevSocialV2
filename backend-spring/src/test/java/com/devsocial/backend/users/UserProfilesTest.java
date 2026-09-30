package com.devsocial.backend.users;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserProfilesTest {
    private final UUID userId = UUID.randomUUID();
    private final AuthenticatedUser principal = new AuthenticatedUser(
            userId, UUID.randomUUID(), UUID.randomUUID(), "token"
    );
    private final FakeUsers repository = new FakeUsers(userId);
    private final UserProfiles profiles = new UserProfiles(repository);

    @Test
    void completesOnboardingOnlyWhenInterestsAreIncluded() {
        Map<String, Object> result = profiles.updateOnboarding(principal, Map.of(
                "techStack", List.of("Java"),
                "interests", List.of("backend")
        ));

        assertThat(result.get("onboardingCompleted")).isEqualTo(true);
        assertThat(repository.profile.get("techStack")).isEqualTo(List.of("Java"));
    }

    @Test
    void mergesSavedAppearanceWithExistingDefaults() {
        repository.settings.put("appearance", Map.of("theme", "dark", "compactMode", true));

        Map<String, Object> response = profiles.appearance(principal);

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> appearance = (Map<String, Object>) data.get("appearanceSettings");
        assertThat(appearance.get("theme")).isEqualTo("dark");
        assertThat(appearance.get("compactMode")).isEqualTo(true);
        assertThat(appearance.get("fontSize")).isEqualTo("medium");
    }

    @Test
    void rejectsFieldsThatNestWouldStripAndForbid() {
        assertThatThrownBy(() -> profiles.updateProfile(principal, Map.of("role", "ADMIN")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("property role should not exist");
    }

    private static class FakeUsers implements UserRepository {
        private final UUID userId;
        private final Map<String, Object> profile = new LinkedHashMap<>();
        private final Map<String, Map<String, Object>> settings = new LinkedHashMap<>();

        private FakeUsers(UUID userId) {
            this.userId = userId;
            profile.put("id", userId);
            profile.put("username", "springdev");
        }

        @Override
        public Optional<Map<String, Object>> findFull(UUID requestedId) {
            return userId.equals(requestedId) ? Optional.of(new LinkedHashMap<>(profile)) : Optional.empty();
        }

        @Override
        public Optional<Map<String, Object>> findPublicByUsername(String username) {
            return Optional.empty();
        }

        @Override
        public Optional<Map<String, Object>> findOnboarding(UUID requestedId) {
            return findFull(requestedId);
        }

        @Override
        public Map<String, Object> updateFields(UUID requestedId, Map<String, Object> fields) {
            profile.putAll(fields);
            return new LinkedHashMap<>(profile);
        }

        @Override
        public List<Map<String, Object>> search(String query, int limit) {
            return List.of();
        }

        @Override
        public List<Map<String, Object>> leaderboard(String period, int limit) {
            return List.of();
        }

        @Override
        public Map<String, Object> readJsonSettings(UUID requestedId, String field) {
            return settings.getOrDefault(field, Map.of());
        }

        @Override
        public void writeJsonSettings(UUID requestedId, String field, Map<String, Object> value) {
            settings.put(field, new LinkedHashMap<>(value));
        }
    }
}
