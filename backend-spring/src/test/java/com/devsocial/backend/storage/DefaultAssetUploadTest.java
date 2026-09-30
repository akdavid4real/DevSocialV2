package com.devsocial.backend.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DefaultAssetUploadTest {
    private static final UUID OWNER = UUID.fromString("1456ba1b-78f7-4b38-8e44-714f6a76937a");
    private static final UUID ASSET = UUID.fromString("c809353d-02d1-4307-9413-c017c513d214");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-30T12:00:00Z"), ZoneOffset.UTC);

    @ParameterizedTest
    @MethodSource("recognizedContent")
    void detectsContentFromMagicBytesInsteadOfTrustingTheClient(byte[] content, String mimeType) {
        assertEquals(mimeType, DefaultAssetUpload.detectMime(content));
    }

    @Test
    void storesTheObjectBeforeRecordingOwnedMetadata() {
        FakeObjects objects = new FakeObjects();
        RecordingMetadata metadata = new RecordingMetadata(false, objects.events);
        DefaultAssetUpload upload = new DefaultAssetUpload(objects, metadata, CLOCK);

        StoredAsset result = upload.store(OWNER, jpeg());

        assertEquals(ASSET, result.assetId());
        assertEquals("image/jpeg", result.mimetype());
        assertTrue(result.objectKey().startsWith("uploads/" + OWNER + "/" + CLOCK.millis() + "-"));
        assertTrue(result.objectKey().endsWith(".jpg"));
        assertEquals(List.of("put", "record"), objects.events);
    }

    @Test
    void deletesTheObjectWhenMetadataCannotBeRecorded() {
        FakeObjects objects = new FakeObjects();
        DefaultAssetUpload upload = new DefaultAssetUpload(
                objects, new RecordingMetadata(true, objects.events), CLOCK);

        assertThrows(UploadFailedException.class, () -> upload.store(OWNER, jpeg()));

        assertEquals(1, objects.deleted.size());
        assertEquals(objects.stored.get(0), objects.deleted.get(0));
    }

    @Test
    void rejectsUnsupportedContentWithoutCallingStorage() {
        FakeObjects objects = new FakeObjects();
        DefaultAssetUpload upload = new DefaultAssetUpload(
                objects, new RecordingMetadata(false, objects.events), CLOCK);

        UploadRejectedException exception = assertThrows(
                UploadRejectedException.class,
                () -> upload.store(OWNER, "not really an image".getBytes())
        );

        assertEquals("Unsupported or invalid file content", exception.getMessage());
        assertTrue(objects.stored.isEmpty());
    }

    @Test
    void rejectsContentLargerThanTwentyMegabytesBeforeCallingStorage() {
        FakeObjects objects = new FakeObjects();
        DefaultAssetUpload upload = new DefaultAssetUpload(
                objects, new RecordingMetadata(false, objects.events), CLOCK);

        UploadRejectedException exception = assertThrows(
                UploadRejectedException.class,
                () -> upload.store(OWNER, new byte[DefaultAssetUpload.MAX_UPLOAD_SIZE + 1])
        );

        assertEquals("File too large. Max size is 20MB.", exception.getMessage());
        assertTrue(objects.stored.isEmpty());
    }

    private static Stream<Arguments> recognizedContent() {
        return Stream.of(
                Arguments.of(jpeg(), "image/jpeg"),
                Arguments.of(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0), "image/png"),
                Arguments.of("GIF89a000000".getBytes(), "image/gif"),
                Arguments.of("RIFF0000WEBP".getBytes(), "image/webp"),
                Arguments.of(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0), "video/webm"),
                Arguments.of("0000ftypisom".getBytes(), "video/mp4"),
                Arguments.of("0000ftypqt  ".getBytes(), "video/quicktime")
        );
    }

    private static byte[] jpeg() {
        return bytes(0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private static byte[] bytes(int... values) {
        byte[] result = new byte[values.length];
        for (int index = 0; index < values.length; index++) result[index] = (byte) values[index];
        return result;
    }

    private static class FakeObjects implements ObjectStorage {
        private final List<String> stored = new ArrayList<>();
        private final List<String> deleted = new ArrayList<>();
        private final List<String> events = new ArrayList<>();

        @Override
        public String put(String bucket, String objectKey, String mimeType, byte[] content) {
            events.add("put");
            stored.add(objectKey);
            return "https://storage.example/" + bucket + "/" + objectKey;
        }

        @Override
        public void delete(String bucket, String objectKey) {
            events.add("delete");
            deleted.add(objectKey);
        }
    }

    private static class RecordingMetadata implements AssetMetadata {
        private final boolean fail;
        private final List<String> events;

        private RecordingMetadata(boolean fail, List<String> events) {
            this.fail = fail;
            this.events = events;
        }

        @Override
        public UUID record(UUID ownerId, String bucket, String objectKey, String publicUrl, String mimeType, int size) {
            events.add("record");
            if (fail) throw new IllegalStateException("database unavailable");
            return ASSET;
        }
    }
}
