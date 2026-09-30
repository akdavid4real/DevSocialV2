package com.devsocial.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = false)
public record EnhanceTextRequest(
        @NotNull @Size(min = 3, max = 2000) String content,
        @NotNull @Pattern(regexp = "professional|casual|funny|hashtags") String action
) {
}
