package com.devsocial.backend.ai;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AiController {
    private final AiAssistance assistance;

    public AiController(AiAssistance assistance) {
        this.assistance = assistance;
    }

    @PostMapping("/posts/summarize")
    Map<String, Object> summarize(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody PostContentAssistRequest request) {
        return assistance.summarize(principal.userId(), request.content());
    }

    @PostMapping("/posts/explain")
    Map<String, Object> explain(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody PostContentAssistRequest request) {
        return assistance.explain(principal.userId(), request.content());
    }

    @PostMapping("/ai/enhance-text")
    Map<String, Object> enhance(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody EnhanceTextRequest request) {
        return assistance.enhance(principal.userId(), request.content(), request.action());
    }
}
