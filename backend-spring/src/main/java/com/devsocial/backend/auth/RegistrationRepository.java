package com.devsocial.backend.auth;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationRepository {
    Optional<UUID> findReferrer(String referralCode);
    Map<String, Object> createUser(RegistrationProfile profile);
    void completeReferral(String referralCode, UUID referrerId, UUID referredId);
}
