CREATE INDEX IF NOT EXISTS "challenge_participation_challengeid_idx" ON public."ChallengeParticipation" ("challengeId");
CREATE INDEX IF NOT EXISTS "feedback_comment_feedbackid_idx" ON public."FeedbackComment" ("feedbackId");
CREATE INDEX IF NOT EXISTS "leaderboard_snapshot_userstatsid_idx" ON public."LeaderboardSnapshot" ("userStatsId");
CREATE INDEX IF NOT EXISTS "mission_progress_missionid_idx" ON public."MissionProgress" ("missionId");
CREATE INDEX IF NOT EXISTS "post_media_postid_idx" ON public."PostMedia" ("postId");
CREATE INDEX IF NOT EXISTS "post_tag_tagid_idx" ON public."PostTag" ("tagId");
CREATE INDEX IF NOT EXISTS "user_mention_mentionerid_idx" ON public."UserMention" ("mentionerId");
CREATE INDEX IF NOT EXISTS "user_mention_postid_idx" ON public."UserMention" ("postId");
