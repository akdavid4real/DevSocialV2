package com.devsocial.backend.referrals;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/referrals")
public class ReferralsController {
    private final Referrals referrals;

    public ReferralsController(Referrals referrals) {
        this.referrals = referrals;
    }

    @GetMapping("/code")
    Map<String, Object> code(@AuthenticationPrincipal AuthenticatedUser principal) {
        return referrals.getOrCreateCode(principal.userId());
    }

    @GetMapping("/stats")
    Map<String, Object> stats(@AuthenticationPrincipal AuthenticatedUser principal) {
        return referrals.stats(principal.userId());
    }

    @PostMapping("/validate")
    Map<String, Object> validate(@Valid @RequestBody ValidateReferralCodeRequest request) {
        return referrals.validate(request.referralCode());
    }

    @PostMapping("/expire-old")
    Map<String, Object> expireOld() {
        return referrals.expireOld();
    }
}
