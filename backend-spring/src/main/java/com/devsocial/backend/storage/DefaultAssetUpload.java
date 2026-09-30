package com.devsocial.backend.storage;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

@Component
public class DefaultAssetUpload implements AssetUpload {
    static final int MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
    private static final String BUCKET = "assets";
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif",
            "video/mp4", "mp4",
            "video/quicktime", "mov",
            "video/webm", "webm"
    );

    private final ObjectStorage objects;
    private final AssetMetadata metadata;
    private final Clock clock;

    @Autowired
    public DefaultAssetUpload(ObjectStorage objects, AssetMetadata metadata) {
        this(objects, metadata, Clock.systemUTC());
    }

    DefaultAssetUpload(ObjectStorage objects, AssetMetadata metadata, Clock clock) {
        this.objects = objects;
        this.metadata = metadata;
        this.clock = clock;
    }

    @Override
    public StoredAsset store(UUID ownerId, byte[] content) {
        if (content.length > MAX_UPLOAD_SIZE) {
            throw new UploadRejectedException("File too large. Max size is 20MB.");
        }
        String mimeType = detectMime(content);
        String extension = mimeType == null ? null : EXTENSIONS.get(mimeType);
        if (extension == null) {
            throw new UploadRejectedException("Unsupported or invalid file content");
        }

        String objectKey = "uploads/" + ownerId + "/" + clock.millis() + "-" + UUID.randomUUID() + "." + extension;
        String publicUrl;
        try {
            publicUrl = objects.put(BUCKET, objectKey, mimeType, content);
        } catch (RuntimeException exception) {
            throw new UploadFailedException(exception);
        }

        try {
            UUID assetId = metadata.record(ownerId, BUCKET, objectKey, publicUrl, mimeType, content.length);
            return new StoredAsset(assetId, publicUrl, objectKey, BUCKET, mimeType, content.length);
        } catch (RuntimeException exception) {
            try {
                objects.delete(BUCKET, objectKey);
            } catch (RuntimeException cleanupFailure) {
                exception.addSuppressed(cleanupFailure);
            }
            throw new UploadFailedException(exception);
        }
    }

    static String detectMime(byte[] content) {
        if (content == null || content.length < 12) return null;
        if (unsigned(content[0]) == 0xff && unsigned(content[1]) == 0xd8 && unsigned(content[2]) == 0xff) {
            return "image/jpeg";
        }
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (startsWith(content, png)) return "image/png";
        String firstSix = ascii(content, 0, 6);
        if ("GIF87a".equals(firstSix) || "GIF89a".equals(firstSix)) return "image/gif";
        if ("RIFF".equals(ascii(content, 0, 4)) && "WEBP".equals(ascii(content, 8, 12))) {
            return "image/webp";
        }
        byte[] webm = {0x1a, 0x45, (byte) 0xdf, (byte) 0xa3};
        if (startsWith(content, webm)) return "video/webm";
        if ("ftyp".equals(ascii(content, 4, 8))) {
            return ascii(content, 8, 12).toLowerCase().contains("qt") ? "video/quicktime" : "video/mp4";
        }
        return null;
    }

    private static int unsigned(byte value) {
        return value & 0xff;
    }

    private static boolean startsWith(byte[] content, byte[] prefix) {
        if (content.length < prefix.length) return false;
        for (int index = 0; index < prefix.length; index++) {
            if (content[index] != prefix[index]) return false;
        }
        return true;
    }

    private static String ascii(byte[] content, int start, int end) {
        return new String(content, start, end - start, java.nio.charset.StandardCharsets.US_ASCII);
    }
}
