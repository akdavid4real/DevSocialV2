package com.devsocial.backend.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Repository
public class JdbcAiAssistance implements AiAssistance {
    private static final Pattern SENTENCES = Pattern.compile("[^.!?]+[.!?]*");
    private static final Pattern EXPLICIT_TAGS = Pattern.compile("#[a-zA-Z0-9_]+");
    private static final DateTimeFormatter MILLIS_INSTANT = new DateTimeFormatterBuilder().appendInstant(3)
            .toFormatter();
    private static final Set<String> COMMON_WORDS = Set.of(
            "about", "after", "also", "been", "being", "build", "from", "have", "into", "just",
            "like", "more", "some", "that", "their", "this", "with", "what", "when", "will", "your"
    );

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate usageTransaction;

    public JdbcAiAssistance(JdbcClient jdbc, ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.usageTransaction = new TransactionTemplate(transactionManager);
        this.usageTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_SERIALIZABLE);
    }

    @Override
    public Map<String, Object> summarize(UUID userId, String content) {
        long start = System.nanoTime();
        Usage usage = consumeUsage(userId, "summaries");
        String summary = buildSummary(content);
        log(userId, "post_summarize", content, summary, start);
        return map("summary", summary, "remainingUsage", usage.remaining(), "monthlyLimit", usage.limit());
    }

    @Override
    public Map<String, Object> explain(UUID userId, String content) {
        long start = System.nanoTime();
        Usage usage = consumeUsage(userId, "explanations");
        String explanation = buildExplanation(content);
        log(userId, "post_explain", content, explanation, start);
        return map("explanation", explanation, "remainingUsage", usage.remaining(), "monthlyLimit", usage.limit());
    }

    @Override
    public Map<String, Object> enhance(UUID userId, String content, String action) {
        long start = System.nanoTime();
        Usage usage = consumeUsage(userId, "enhancements");
        String enhanced = buildEnhancement(content, action);
        log(userId, "text_enhance_" + action, content, enhanced, start);
        return map("enhanced", enhanced, "remainingUsage", usage.remaining(), "monthlyLimit", usage.limit());
    }

    private Usage consumeUsage(UUID userId, String key) {
        Usage result = usageTransaction.execute(status -> {
            String lockKey = "ai-usage:" + userId + ":" + key;
            jdbc.sql("SELECT pg_advisory_xact_lock(hashtext(:lockKey))")
                    .param("lockKey", lockKey).query((rs, row) -> 0).single();
            UsageAccount account = jdbc.sql("""
                            SELECT "aiUsage"::text AS usage, "isPremium" FROM "User"
                            WHERE id = :userId FOR UPDATE
                            """).param("userId", userId)
                    .query((rs, row) -> new UsageAccount(jsonMap(rs.getString("usage")),
                            rs.getBoolean("isPremium")))
                    .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "User not found"));
            int limit = account.premium() ? 100 : "explanations".equals(key) ? 10 : 5;
            String period = currentPeriod();
            Map<String, Object> bucket = currentBucket(account.usage().get(key), period, limit);
            int used = ((Number) bucket.get("used")).intValue();
            if (used >= limit)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Monthly limit of " + limit + " AI " + key + " reached");

            Map<String, Object> next = new LinkedHashMap<>(account.usage());
            next.put("resetsOn", nextResetDate());
            next.put(key, map("used", used + 1, "limit", limit, "period", period));
            jdbc.sql("UPDATE \"User\" SET \"aiUsage\" = CAST(:usage AS jsonb), \"updatedAt\" = now() "
                            + "WHERE id = :userId")
                    .param("usage", json(next)).param("userId", userId).update();
            return new Usage(limit, Math.max(limit - used - 1, 0));
        });
        if (result == null) throw new IllegalStateException("AI usage transaction returned no result");
        return result;
    }

    private Map<String, Object> currentBucket(Object raw, String period, int limit) {
        if (!(raw instanceof Map<?, ?> bucket) || !period.equals(bucket.get("period")))
            return map("used", 0, "limit", limit, "period", period);
        int used = bucket.get("used") instanceof Number number ? number.intValue() : 0;
        return map("used", used, "limit", limit, "period", period);
    }

    private void log(UUID userId, String taskType, String input, String output, long start) {
        int elapsed = (int) Math.min((System.nanoTime() - start) / 1_000_000L, Integer.MAX_VALUE);
        String summary = output.substring(0, Math.min(output.length(), 500));
        jdbc.sql("""
                        INSERT INTO "AiLog"
                          (id, service, "aiModel", "taskType", "inputLength", "outputSummary", "userId",
                           success, "executionTime", "createdAt")
                        VALUES (:id, CAST('GEMINI' AS "AiService"), 'local-deterministic-assist', :taskType,
                          :inputLength, :outputSummary, :userId, true, :executionTime, now())
                        """).param("id", UUID.randomUUID()).param("taskType", taskType)
                .param("inputLength", input.length()).param("outputSummary", summary)
                .param("userId", userId).param("executionTime", elapsed).update();
    }

    static String buildSummary(String content) {
        String normalized = normalize(content);
        Matcher matcher = SENTENCES.matcher(normalized);
        List<String> sentences = new ArrayList<>();
        while (matcher.find() && sentences.size() < 2) {
            String sentence = matcher.group().trim();
            if (!sentence.isEmpty()) sentences.add(sentence);
        }
        String summary = String.join(" ", sentences);
        return truncate(summary.isEmpty() ? normalized : summary, 280);
    }

    static String buildExplanation(String content) {
        String normalized = normalize(content);
        List<String> topics = extractTopics(normalized);
        String suffix = topics.isEmpty() ? "" : " It seems to focus on " + String.join(", ", topics) + ".";
        return "In plain terms, this post is saying: " + truncate(normalized, 180) + suffix;
    }

    static String buildEnhancement(String content, String action) {
        String normalized = normalize(content);
        if ("hashtags".equals(action)) {
            List<String> tags = extractTopics(normalized).stream().limit(5)
                    .map(topic -> "#" + topic.replaceAll("[^a-z0-9]", ""))
                    .filter(tag -> tag.length() > 1).toList();
            return tags.isEmpty() ? normalized : normalized + "\n\n" + String.join(" ", tags);
        }
        if ("professional".equals(action)) return "Sharing an update: " + sentenceCase(normalized);
        if ("funny".equals(action))
            return sentenceCase(normalized) + " Small bug-fix for the mood: we survived the build.";
        return sentenceCase(normalized);
    }

    private static List<String> extractTopics(String content) {
        LinkedHashSet<String> topics = new LinkedHashSet<>();
        Matcher tags = EXPLICIT_TAGS.matcher(content);
        while (tags.find()) topics.add(tags.group().substring(1).toLowerCase(Locale.ROOT));
        String normalized = content.toLowerCase(Locale.ROOT)
                .replaceAll("https?://\\S+", "")
                .replaceAll("[^a-z0-9#\\s]", " ");
        Arrays.stream(normalized.split("\\s+"))
                .filter(word -> word.length() > 3 && !COMMON_WORDS.contains(word))
                .forEach(topics::add);
        return topics.stream().limit(6).toList();
    }

    private static String normalize(String content) {
        return content.replaceAll("\\s+", " ").trim();
    }

    private static String truncate(String content, int maximum) {
        if (content.length() <= maximum) return content;
        return content.substring(0, maximum - 3).trim() + "...";
    }

    private static String sentenceCase(String content) {
        if (content.isEmpty()) return content;
        return content.substring(0, 1).toUpperCase(Locale.ROOT) + content.substring(1);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonMap(String raw) {
        if (raw == null) return new LinkedHashMap<>();
        try {
            Object value = objectMapper.readValue(raw, Object.class);
            return value instanceof Map<?, ?> map
                    ? new LinkedHashMap<>((Map<String, Object>) map) : new LinkedHashMap<>();
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored AI usage is invalid JSON", exception);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("AI usage is not valid JSON", exception);
        }
    }

    private String currentPeriod() {
        return YearMonth.now(ZoneOffset.UTC).toString();
    }

    private String nextResetDate() {
        Instant reset = YearMonth.now(ZoneOffset.UTC).plusMonths(1).atDay(1)
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        return MILLIS_INSTANT.format(reset);
    }

    private Map<String, Object> map(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < values.length; index += 2)
            result.put((String) values[index], values[index + 1]);
        return result;
    }

    private record UsageAccount(Map<String, Object> usage, boolean premium) { }
    private record Usage(int limit, int remaining) { }
}
