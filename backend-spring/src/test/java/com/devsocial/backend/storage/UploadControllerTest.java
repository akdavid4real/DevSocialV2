package com.devsocial.backend.storage;

import com.devsocial.backend.auth.AuthAccount;
import com.devsocial.backend.auth.AuthAccountRepository;
import com.devsocial.backend.auth.SupabaseIdentityProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(UploadControllerTest.Fakes.class)
class UploadControllerTest {
    private static final UUID USER_ID = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID ASSET_ID = UUID.fromString("c809353d-02d1-4307-9413-c017c513d214");
    private static final UUID SUPABASE_ID = UUID.fromString("24ab646b-8b7a-4b83-939d-f327dd4d1c5f");
    private static final UUID SESSION_ID = UUID.fromString("f18f6d09-c48a-46aa-9813-8695c709bc43");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void uploadRequiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/upload").file(file()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsTheExistingUploadContract() throws Exception {
        mockMvc.perform(multipart("/upload").file(file()).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.assetId").value(ASSET_ID.toString()))
                .andExpect(jsonPath("$.data.url").value("https://storage.example/assets/upload.jpg"))
                .andExpect(jsonPath("$.data.mimetype").value("image/jpeg"))
                .andExpect(jsonPath("$.data.size").value(12));
    }

    @Test
    void supportsTheLegacyStorageUploadAliasUsedByTheFrontend() throws Exception {
        mockMvc.perform(multipart("/storage/upload").file(file()).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").value("https://storage.example/assets/upload.jpg"));
    }

    @Test
    void missingMultipartFileReturnsCompatibilityError() throws Exception {
        mockMvc.perform(multipart("/upload").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("No file uploaded"));
    }

    private static MockMultipartFile file() {
        return new MockMultipartFile(
                "file", "avatar.jpg", "text/plain",
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0}
        );
    }

    private static String bearer() {
        String payload = "{\"session_id\":\"" + SESSION_ID + "\"}";
        String encoded = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return "Bearer header." + encoded + ".signature";
    }

    @TestConfiguration
    static class Fakes {
        @Bean
        @Primary
        SupabaseIdentityProvider identityProvider() {
            return token -> SUPABASE_ID;
        }

        @Bean
        @Primary
        AuthAccountRepository authAccounts() {
            return new AuthAccountRepository() {
                @Override
                public boolean isSessionActive(UUID sessionId, UUID supabaseUserId) {
                    return SESSION_ID.equals(sessionId) && SUPABASE_ID.equals(supabaseUserId);
                }

                @Override
                public Optional<AuthAccount> findBySupabaseUserId(UUID supabaseUserId) {
                    return Optional.of(new AuthAccount(USER_ID, false));
                }
            };
        }

        @Bean
        @Primary
        AssetUpload uploads() {
            return (ownerId, content) -> new StoredAsset(
                    ASSET_ID,
                    "https://storage.example/assets/upload.jpg",
                    "uploads/" + ownerId + "/upload.jpg",
                    "assets",
                    "image/jpeg",
                    content.length
            );
        }
    }
}
