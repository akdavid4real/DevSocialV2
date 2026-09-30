package com.devsocial.backend.challenges;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Complete web challenge workflow seam, including rewards and leaderboard behavior. */
public interface Challenges {
    List<Map<String, Object>> findActive(UUID userId);
    Map<String, Object> create(UUID userId, CreateChallengeRequest request);
    List<Map<String, Object>> findUserChallenges(UUID userId);
    Map<String, Object> join(UUID userId, UUID challengeId);
    Map<String, Object> submit(UUID userId, UUID challengeId, SubmitChallengeProgressRequest request);
    List<Map<String, Object>> leaderboard(UUID challengeId);
}
