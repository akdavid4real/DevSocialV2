package com.devsocial.backend.knowledge;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = false)
public record CreateKnowledgeEntryRequest(
        @NotBlank @Size(min = 3, max = 200) String title,
        @NotBlank @Size(min = 2) String technology,
        @NotBlank @Pattern(regexp = "TUTORIAL|CODE_SNIPPET|BEST_PRACTICE|TROUBLESHOOTING|CONFIGURATION|API_REFERENCE|COMMAND_REFERENCE|QUICK_TIP") String category,
        @NotBlank @Size(min = 20) String content,
        String codeExample,
        List<String> tags
) {
}
