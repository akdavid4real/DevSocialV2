package com.devsocial.backend.knowledge;

import com.devsocial.backend.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/knowledge-bank")
public class KnowledgeBankController {
    private final KnowledgeBank knowledgeBank;

    public KnowledgeBankController(KnowledgeBank knowledgeBank) {
        this.knowledgeBank = knowledgeBank;
    }

    @GetMapping
    Map<String, Object> findAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String technology,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        int safePage = page == null || page < 1 ? 1 : page;
        int safeLimit = limit == null || limit < 1 ? 20 : Math.min(limit, 50);
        return knowledgeBank.findAll(safePage, safeLimit, technology, category, search);
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody CreateKnowledgeEntryRequest request) {
        return knowledgeBank.create(principal.userId(), request);
    }

    @GetMapping("/{id}")
    Map<String, Object> findOne(@PathVariable UUID id) {
        return knowledgeBank.findOne(id);
    }
}
