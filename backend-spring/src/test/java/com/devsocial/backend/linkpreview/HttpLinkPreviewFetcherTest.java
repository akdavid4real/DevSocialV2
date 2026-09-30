package com.devsocial.backend.linkpreview;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSession;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HttpLinkPreviewFetcherTest {
    @Test
    void extractsMetadataAndResolvesRelativeImages() {
        String html = """
                <html><head>
                  <meta property="og:title" content="  Spring   migration ">
                  <meta name="description" content="A backend migration guide">
                  <meta content="/images/cover.png" property="og:image">
                  <meta property="og:site_name" content="DevSocial">
                  <title>Fallback title</title>
                </head></html>
                """;
        FakeHttpClient client = new FakeHttpClient(200, "text/html; charset=utf-8", html);
        HttpLinkPreviewFetcher fetcher = new HttpLinkPreviewFetcher(client);

        Map<String, Object> preview = fetcher.preview("https://example.com/article");

        assertThat(preview).containsEntry("title", "Spring migration")
                .containsEntry("description", "A backend migration guide")
                .containsEntry("image", "https://example.com/images/cover.png")
                .containsEntry("url", "https://example.com/article")
                .containsEntry("siteName", "DevSocial");
        assertThat(client.request.timeout()).contains(Duration.ofSeconds(5));
        assertThat(client.request.headers().firstValue("Accept")).contains("text/html,application/xhtml+xml");
    }

    @Test
    void rejectsNonHtmlResponses() {
        HttpLinkPreviewFetcher fetcher = new HttpLinkPreviewFetcher(
                new FakeHttpClient(200, "application/json", "{}"));

        assertThatThrownBy(() -> fetcher.preview("https://example.com/data"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("URL does not point to an HTML page");
    }

    @Test
    void rejectsUnsupportedSchemesBeforeFetching() {
        HttpLinkPreviewFetcher fetcher = new HttpLinkPreviewFetcher(
                new FakeHttpClient(200, "text/html", "<title>Unused</title>"));

        assertThatThrownBy(() -> fetcher.preview("file:///etc/passwd"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only HTTP and HTTPS URLs are supported");
        assertThatThrownBy(() -> fetcher.preview("ftp://example.com/file"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only HTTP and HTTPS URLs are supported");
    }

    private static final class FakeHttpClient extends HttpClient {
        private final int status;
        private final String contentType;
        private final String body;
        private HttpRequest request;

        private FakeHttpClient(int status, String contentType, String body) {
            this.status = status;
            this.contentType = contentType;
            this.body = body;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> handler)
                throws IOException, InterruptedException {
            this.request = request;
            return (HttpResponse<T>) new FakeResponse(request, status, contentType, body);
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(
                HttpRequest request, HttpResponse.BodyHandler<T> handler) {
            return CompletableFuture.failedFuture(new UnsupportedOperationException());
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(HttpRequest request,
                HttpResponse.BodyHandler<T> handler, HttpResponse.PushPromiseHandler<T> pushPromiseHandler) {
            return CompletableFuture.failedFuture(new UnsupportedOperationException());
        }

        @Override public Optional<CookieHandler> cookieHandler() { return Optional.empty(); }
        @Override public Optional<Duration> connectTimeout() { return Optional.of(Duration.ofSeconds(5)); }
        @Override public Redirect followRedirects() { return Redirect.NORMAL; }
        @Override public Optional<ProxySelector> proxy() { return Optional.empty(); }
        @Override public SSLContext sslContext() { return null; }
        @Override public SSLParameters sslParameters() { return new SSLParameters(); }
        @Override public Optional<Authenticator> authenticator() { return Optional.empty(); }
        @Override public Version version() { return Version.HTTP_1_1; }
        @Override public Optional<Executor> executor() { return Optional.empty(); }
    }

    private record FakeResponse(HttpRequest request, int statusCode, String contentType, String content)
            implements HttpResponse<ByteArrayInputStream> {
        @Override public ByteArrayInputStream body() {
            return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
        }
        @Override public Optional<HttpResponse<ByteArrayInputStream>> previousResponse() { return Optional.empty(); }
        @Override public HttpHeaders headers() {
            return HttpHeaders.of(Map.of("content-type", List.of(contentType)), (name, value) -> true);
        }
        @Override public Optional<SSLSession> sslSession() { return Optional.empty(); }
        @Override public URI uri() { return request.uri(); }
        @Override public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
    }
}
