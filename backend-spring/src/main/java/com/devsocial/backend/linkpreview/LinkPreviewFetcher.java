package com.devsocial.backend.linkpreview;

import java.util.Map;

/** Validated HTML metadata fetch seam for the web post composer. */
public interface LinkPreviewFetcher {
    Map<String, Object> preview(String rawUrl);
}
