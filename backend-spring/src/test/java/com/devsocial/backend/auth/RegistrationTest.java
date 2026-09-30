package com.devsocial.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RegistrationTest {

    private final UUID supabaseUserId = UUID.randomUUID();
    private final UUID localUserId = UUID.randomUUID();

    @Test
    void rejectsInvalidReferralBeforeCreatingSupabaseUser() {
        AtomicBoolean signupCalled = new AtomicBoolean();
        Registration registration = new Registration(
                (email, password, metadata) -> {
                    signupCalled.set(true);
                    return supabaseUserId;
                },
                noOpAccounts(),
                repository(Optional.empty(), false)
        );

        assertThatThrownBy(() -> registration.register(request("missing-code")))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(exception.getReason()).isEqualTo("Invalid referral code");
                });
        assertThat(signupCalled).isFalse();
    }

    @Test
    void removesSupabaseUserWhenLocalUniquenessFails() {
        AtomicBoolean deleted = new AtomicBoolean();
        SupabaseAccountGateway accounts = accountGateway(deleted);
        Registration registration = new Registration(
                (email, password, metadata) -> supabaseUserId,
                accounts,
                repository(Optional.empty(), true)
        );

        assertThatThrownBy(() -> registration.register(request(null)))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).isEqualTo("Username or email already taken in database");
                });
        assertThat(deleted).isTrue();
    }

    @Test
    void normalizesRegistrationAndCompletesReferralAfterUserCreation() {
        UUID referrerId = UUID.randomUUID();
        AtomicBoolean referralCompleted = new AtomicBoolean();
        RegistrationRepository repository = new RegistrationRepository() {
            @Override
            public Optional<UUID> findReferrer(String referralCode) {
                return Optional.of(referrerId);
            }

            @Override
            public Map<String, Object> createUser(RegistrationProfile profile) {
                assertThat(profile.email()).isEqualTo("newuser@devsocial.test");
                assertThat(profile.username()).isEqualTo("new_dev");
                assertThat(profile.affiliation()).isEqualTo("Other");
                return Map.of("id", localUserId, "email", profile.email());
            }

            @Override
            public void completeReferral(String code, UUID sponsor, UUID referred) {
                assertThat(code).isEqualTo("VALID");
                assertThat(sponsor).isEqualTo(referrerId);
                assertThat(referred).isEqualTo(localUserId);
                referralCompleted.set(true);
            }
        };

        Registration registration = new Registration(
                (email, password, metadata) -> supabaseUserId,
                noOpAccounts(),
                repository
        );

        Map<String, Object> result = registration.register(request("VALID"));

        assertThat(result.get("id")).isEqualTo(localUserId);
        assertThat(referralCompleted).isTrue();
    }

    private RegistrationRepository repository(Optional<UUID> referrer, boolean duplicate) {
        return new RegistrationRepository() {
            @Override
            public Optional<UUID> findReferrer(String referralCode) {
                return referrer;
            }

            @Override
            public Map<String, Object> createUser(RegistrationProfile profile) {
                if (duplicate) {
                    throw new DataIntegrityViolationException("duplicate");
                }
                return Map.of("id", localUserId);
            }

            @Override
            public void completeReferral(String referralCode, UUID referrerId, UUID referredId) {
            }
        };
    }

    private RegisterRequest request(String referralCode) {
        return new RegisterRequest(
                " NewUser@DevSocial.test ",
                "secret1",
                " new_dev ",
                "New",
                "Developer",
                null,
                null,
                null,
                null,
                referralCode,
                null
        );
    }

    private SupabaseAccountGateway noOpAccounts() {
        return accountGateway(new AtomicBoolean());
    }

    private SupabaseAccountGateway accountGateway(AtomicBoolean deleted) {
        return new SupabaseAccountGateway() {
            @Override
            public UUID verifySignupOtp(String email, String token) {
                return supabaseUserId;
            }

            @Override
            public void sendPasswordReset(String email, String redirectUrl) {
            }

            @Override
            public void updatePassword(UUID userId, String newPassword) {
            }

            @Override
            public void deleteUser(UUID userId) {
                deleted.set(true);
            }

            @Override
            public void signOut(String accessToken, SignOutScope scope) {
            }
        };
    }
}
