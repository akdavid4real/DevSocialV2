package com.devsocial.backend.referrals;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record ValidateReferralCodeRequest(
        @NotBlank @Size(min = 3, max = 80) String referralCode
) {
}
