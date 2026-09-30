package com.devsocial.backend.linkpreview;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HttpLinkPreviewFetcher implements LinkPreviewFetcher {
    private static final int MAX_HTML_BYTES = 250_000;
    private static final Pattern TITLE = Pattern.compile("<title[^>]*>([^<]+)</title>", Pattern.CASE_INSENSITIVE);

    private final HttpClient httpClient;

    public HttpLinkPreviewFetcher(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public Map<String, Object> preview(String rawUrl) {
        URI uri = parseUrl(rawUrl);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(5))
                .header("User-Agent", "Mozilla/5.0 (compatible; DevSocial/2.0; +https://devsocial.com)")
                .header("Accept", "text/html,application/xhtml+xml")
                .GET().build();
        try {
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw badRequest("Unable to fetch link preview");
            String contentType = response.headers().firstValue("content-type").orElse("");
            if (!contentType.toLowerCase().contains("text/html"))
                throw badRequest("URL does not point to an HTML page");
            String html;
            try (InputStream body = response.body()) {
                html = new String(body.readNBytes(MAX_HTML_BYTES), StandardCharsets.UTF_8);
            }
            String title = first(meta(html, "og:title"), meta(html, "twitter:title"), title(html), uri.getHost());
            String description = first(meta(html, "og:description"), meta(html, "twitter:description"),
                    meta(html, "description"), "");
            String image = absolute(first(meta(html, "og:image"), meta(html, "twitter:image"), ""), uri);
            String hostname = uri.getHost() == null ? "" : uri.getHost().replaceFirst("^www\\.", "");
            String siteName = first(meta(html, "og:site_name"), hostname);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("title", clean(title));
            result.put("description", clean(description));
            result.put("image", image);
            result.put("url", uri.toString());
            result.put("siteName", clean(siteName));
            return result;
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw badRequest("Failed to fetch link preview");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw badRequest("Failed to fetch link preview");
        }
    }

    private URI parseUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) throw badRequest("URL is required");
        URI uri;
        try {
            uri = new URI(rawUrl);
        } catch (URISyntaxException exception) {
            throw badRequest("Invalid URL");
        }
        if (uri.getScheme() == null) throw badRequest("Invalid URL");
        if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme()))
            throw badRequest("Only HTTP and HTTPS URLs are supported");
        if (uri.getHost() == null) throw badRequest("Invalid URL");
        return uri;
    }

    private String meta(String html, String property) {
        String escaped = Pattern.quote(property);
        Pattern normal = Pattern.compile("<meta[^>]*(?:property|name)=[\\\"']" + escaped
                + "[\\\"'][^>]*content=[\\\"']([^\\\"']*)[\\\"'][^>]*>", Pattern.CASE_INSENSITIVE);
        Pattern reversed = Pattern.compile("<meta[^>]*content=[\\\"']([^\\\"']*)[\\\"'][^>]*(?:property|name)=[\\\"']"
                + escaped + "[\\\"'][^>]*>", Pattern.CASE_INSENSITIVE);
        Matcher first = normal.matcher(html);
        if (first.find() && !first.group(1).isBlank()) return first.group(1);
        Matcher second = reversed.matcher(html);
        return second.find() && !second.group(1).isBlank() ? second.group(1) : "";
    }

    private String title(String html) {
        Matcher matcher = TITLE.matcher(html);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String absolute(String value, URI base) {
        if (value == null || value.isBlank()) return "";
        try {
            return base.resolve(value).toString();
        } catch (IllegalArgumentException exception) {
            return "";
        }
    }

    private String first(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return "";
    }

    private String clean(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
