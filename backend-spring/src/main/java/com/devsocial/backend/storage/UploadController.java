package com.devsocial.backend.storage;

import com.devsocial.backend.auth.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class UploadController {
    private final AssetUpload uploads;

    public UploadController(AssetUpload uploads) {
        this.uploads = uploads;
    }

    @PostMapping({"/upload", "/storage/upload"})
    Map<String, Object> upload(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        if (file == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        try {
            StoredAsset asset = uploads.store(principal.userId(), file.getBytes());
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("assetId", asset.assetId());
            response.put("url", asset.url());
            response.put("objectKey", asset.objectKey());
            response.put("bucket", asset.bucket());
            response.put("mimetype", asset.mimetype());
            response.put("size", asset.size());
            return response;
        } catch (UploadRejectedException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        } catch (UploadFailedException | IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload failed", exception);
        }
    }
}
