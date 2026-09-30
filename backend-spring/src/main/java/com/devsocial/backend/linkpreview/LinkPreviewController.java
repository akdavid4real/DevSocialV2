package com.devsocial.backend.linkpreview;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/link-preview")
public class LinkPreviewController {
    private final LinkPreviewFetcher previews;

    public LinkPreviewController(LinkPreviewFetcher previews) {
        this.previews = previews;
    }

    @PostMapping
    Map<String, Object> preview(@RequestBody LinkPreviewRequest request) {
        return previews.preview(request.url());
    }
}
