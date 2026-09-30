package com.devsocial.backend.linkpreview;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(LinkPreviewControllerTest.Fakes.class)
class LinkPreviewControllerTest {
    @Autowired MockMvc mockMvc;

    @Test
    void previewIsPublicAndPreservesTheWebContract() throws Exception {
        mockMvc.perform(post("/link-preview").contentType("application/json")
                        .content("{\"url\":\"https://example.com/articles/spring\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Spring migration"))
                .andExpect(jsonPath("$.data.description").value("A backend migration guide"))
                .andExpect(jsonPath("$.data.image").value("https://example.com/cover.png"))
                .andExpect(jsonPath("$.data.url").value("https://example.com/articles/spring"))
                .andExpect(jsonPath("$.data.siteName").value("Example"));
    }

    @Test
    void missingUrlIsRejected() throws Exception {
        mockMvc.perform(post("/link-preview").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonHttpUrlIsRejected() throws Exception {
        mockMvc.perform(post("/link-preview").contentType("application/json")
                        .content("{\"url\":\"file:///etc/passwd\"}"))
                .andExpect(status().isBadRequest());
    }

    @TestConfiguration
    static class Fakes {
        @Bean
        @Primary
        LinkPreviewFetcher linkPreviewFetcher() {
            return rawUrl -> {
                if (rawUrl == null || rawUrl.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL is required");
                }
                if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Only HTTP and HTTPS URLs are supported");
                }
                Map<String, Object> preview = new LinkedHashMap<>();
                preview.put("title", "Spring migration");
                preview.put("description", "A backend migration guide");
                preview.put("image", "https://example.com/cover.png");
                preview.put("url", rawUrl);
                preview.put("siteName", "Example");
                return preview;
            };
        }
    }
}
