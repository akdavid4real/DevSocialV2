package com.devsocial.backend.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JdbcAiAssistanceTextTest {
    @Test
    void summaryUsesTheFirstTwoSentencesAndTheExistingLimit() {
        String content = "First point about Spring. Second point about tests! Third point is omitted?";

        assertThat(JdbcAiAssistance.buildSummary(content))
                .isEqualTo("First point about Spring. Second point about tests!");
        assertThat(JdbcAiAssistance.buildSummary("x".repeat(300)))
                .hasSize(280).endsWith("...");
    }

    @Test
    void explanationNormalizesContentAndExtractsTopics() {
        assertThat(JdbcAiAssistance.buildExplanation("  Spring   migration with #JUnit tests  "))
                .isEqualTo("In plain terms, this post is saying: Spring migration with #JUnit tests "
                        + "It seems to focus on junit, spring, migration, #junit, tests.");
    }

    @Test
    void enhancementActionsMatchTheNestBehavior() {
        assertThat(JdbcAiAssistance.buildEnhancement("shipping today", "professional"))
                .isEqualTo("Sharing an update: Shipping today");
        assertThat(JdbcAiAssistance.buildEnhancement("shipping today", "casual"))
                .isEqualTo("Shipping today");
        assertThat(JdbcAiAssistance.buildEnhancement("shipping today", "funny"))
                .isEqualTo("Shipping today Small bug-fix for the mood: we survived the build.");
        assertThat(JdbcAiAssistance.buildEnhancement("Spring migration testing", "hashtags"))
                .isEqualTo("Spring migration testing\n\n#spring #migration #testing");
    }
}
