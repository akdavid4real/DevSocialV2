package com.devsocial.backend.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SupabaseObjectStorageTest {
    private MockRestServiceServer server;
    private SupabaseObjectStorage storage;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        storage = new SupabaseObjectStorage(builder, "https://project.supabase.co/", "service-key");
    }

    @Test
    void uploadsRawContentWithTheSupabaseStorageHeaders() {
        byte[] content = {1, 2, 3};
        server.expect(requestTo("https://project.supabase.co/storage/v1/object/assets/uploads/user/file.png"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("apikey", "service-key"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer service-key"))
                .andExpect(header("x-upsert", "false"))
                .andExpect(header(HttpHeaders.CACHE_CONTROL, "max-age=31536000"))
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(content))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        String url = storage.put("assets", "uploads/user/file.png", "image/png", content);

        assertEquals(
                "https://project.supabase.co/storage/v1/object/public/assets/uploads/user/file.png",
                url
        );
        server.verify();
    }

    @Test
    void deletesACompensatedObjectThroughTheStorageEndpoint() {
        server.expect(requestTo("https://project.supabase.co/storage/v1/object/assets/uploads/user/file.png"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header("apikey", "service-key"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer service-key"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        storage.delete("assets", "uploads/user/file.png");

        server.verify();
    }
}
