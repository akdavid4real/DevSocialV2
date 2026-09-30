package com.devsocial.backend.linkpreview;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = false)
public record LinkPreviewRequest(String url) {
}
