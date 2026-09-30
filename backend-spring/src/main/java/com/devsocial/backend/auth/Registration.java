package com.devsocial.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class Registration {
    private static final Logger logger = LoggerFactory.getLogger(Registration.class);

    private final SupabaseRegistrationGateway supabaseRegistration;
    private final SupabaseAccountGateway supabaseAccounts;
    private final RegistrationRepository registrations;

    public Registration(
            SupabaseRegistrationGateway supabaseRegistration,
            SupabaseAccountGateway supabaseAccounts,
            RegistrationRepository registrations
    ) {
        this.supabaseRegistration = supabaseRegistration;
        this.supabaseAccounts = supabaseAccounts;
        this.registrations = registrations;
    }

    public Map<String, Object> register(RegisterRequest request) {
        String referralCode = blankToNull(request.referralCode());
        Optional<UUID> referrerId = referralCode == null
                ? Optional.empty()
                : registrations.findReferrer(referralCode);
        if (referralCode != null && referrerId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid referral code");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String username = request.username().trim();
        UUID supabaseUserId;
        try {
            supabaseUserId = supabaseRegistration.signUp(
                    email,
                    request.password(),
                    Map.of(
                            "username", username,
                            "full_name", (request.firstName() + " " + request.lastName()).trim()
                    )
            );
        } catch (SupabaseAuthException exception) {
            String message = exception.getMessage() == null ? "Failed to create auth user" : exception.getMessage();
            if (message.toLowerCase(Locale.ROOT).contains("already registered")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "User with this email already exists");
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, message);
        }

        Map<String, Object> user;
        try {
            user = registrations.createUser(new RegistrationProfile(
                    supabaseUserId,
                    email,
                    username,
                    request.firstName(),
                    request.lastName(),
                    request.birthMonth(),
                    request.birthDay(),
                    blankToDefault(request.affiliation(), "Other")
            ));
        } catch (DataIntegrityViolationException exception) {
            deleteOrphanedAuthUser(supabaseUserId);
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Username or email already taken in database"
            );
        } catch (RuntimeException exception) {
            deleteOrphanedAuthUser(supabaseUserId);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create user profile");
        }

        if (referralCode != null && referrerId.isPresent()) {
            try {
                UUID referredId = UUID.fromString(String.valueOf(user.get("id")));
                registrations.completeReferral(referralCode, referrerId.get(), referredId);
            } catch (RuntimeException exception) {
                logger.warn("Referral processing failed after registration: {}", exception.getMessage());
            }
        }

        return user;
    }

    private void deleteOrphanedAuthUser(UUID supabaseUserId) {
        try {
            supabaseAccounts.deleteUser(supabaseUserId);
        } catch (RuntimeException exception) {
            logger.error("Failed to clean up Supabase user {} after registration failure", supabaseUserId, exception);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
