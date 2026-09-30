package com.devsocial.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record PostContentAssistRequest(
        @NotNull @Size(min = 10, max = 5000) String content
) {
}
