package com.devsocial.backend.referrals;

import java.util.Map;
import java.util.UUID;

/** Referral-code and owner-statistics seam for the web experience. */
public interface Referrals {
    Map<String, Object> getOrCreateCode(UUID userId);
    Map<String, Object> stats(UUID userId);
    Map<String, Object> validate(String referralCode);
    Map<String, Object> expireOld();
}
