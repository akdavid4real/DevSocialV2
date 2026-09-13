-- =====================================================================
-- ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- DevSocial V2 — Run this in Supabase SQL Editor
-- =====================================================================
--
-- WHY: Your Supabase anon key is public (embedded in frontend).
-- Without RLS, anyone with that key can query ALL data directly
-- via the Supabase REST API, bypassing your NestJS backend entirely.
--
-- HOW IT WORKS:
-- - Your NestJS backend uses DATABASE_URL (postgres role) → bypasses RLS
-- - Frontend Supabase client uses anon key → RLS applies
-- - Any external attacker using anon key → RLS blocks them
--
-- HELPER: We create a reusable function to get the current user's
-- internal UUID from their Supabase auth ID.
-- =====================================================================

-- Helper function: get internal user ID from Supabase auth
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid AS $$
  SELECT id FROM "User" WHERE "supabaseAuthId" = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =====================================================================
-- 1. User
-- =====================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user profiles"
  ON "User" FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING ("supabaseAuthId" = auth.uid()::text);

CREATE POLICY "Users can insert own profile"
  ON "User" FOR INSERT
  WITH CHECK ("supabaseAuthId" = auth.uid()::text);

-- No delete policy — users cannot delete their own accounts via REST API


-- =====================================================================
-- 2. Affiliation (public reference data)
-- =====================================================================
ALTER TABLE "Affiliation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view affiliations"
  ON "Affiliation" FOR SELECT
  USING (true);

-- Only backend/admin can insert/update/delete (no policies needed, handled by postgres role)


-- =====================================================================
-- 3. Post
-- =====================================================================
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active posts"
  ON "Post" FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "Users can create own posts"
  ON "Post" FOR INSERT
  WITH CHECK ("authorId" = get_current_user_id());

CREATE POLICY "Users can update own posts"
  ON "Post" FOR UPDATE
  USING ("authorId" = get_current_user_id());

CREATE POLICY "Users can delete own posts"
  ON "Post" FOR DELETE
  USING ("authorId" = get_current_user_id());


-- =====================================================================
-- 4. PostMedia
-- =====================================================================
ALTER TABLE "PostMedia" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post media"
  ON "PostMedia" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Post" WHERE "Post".id = "PostMedia"."postId" AND "Post".status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can add media to own posts"
  ON "PostMedia" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Post" WHERE "Post".id = "PostMedia"."postId" AND "Post"."authorId" = get_current_user_id()
    )
  );

CREATE POLICY "Users can delete own post media"
  ON "PostMedia" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Post" WHERE "Post".id = "PostMedia"."postId" AND "Post"."authorId" = get_current_user_id()
    )
  );


-- =====================================================================
-- 5. Comment
-- =====================================================================
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON "Comment" FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON "Comment" FOR INSERT
  WITH CHECK ("authorId" = get_current_user_id());

CREATE POLICY "Users can update own comments"
  ON "Comment" FOR UPDATE
  USING ("authorId" = get_current_user_id());

CREATE POLICY "Users can delete own comments"
  ON "Comment" FOR DELETE
  USING ("authorId" = get_current_user_id());


-- =====================================================================
-- 6. Like
-- =====================================================================
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON "Like" FOR SELECT
  USING (true);

CREATE POLICY "Users can create own likes"
  ON "Like" FOR INSERT
  WITH CHECK ("userId" = get_current_user_id());

CREATE POLICY "Users can remove own likes"
  ON "Like" FOR DELETE
  USING ("userId" = get_current_user_id());


-- =====================================================================
-- 7. Follow
-- =====================================================================
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON "Follow" FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON "Follow" FOR INSERT
  WITH CHECK ("followerId" = get_current_user_id());

CREATE POLICY "Users can unfollow"
  ON "Follow" FOR DELETE
  USING ("followerId" = get_current_user_id());


-- =====================================================================
-- 8. Block
-- =====================================================================
ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own blocks"
  ON "Block" FOR SELECT
  USING ("blockerId" = get_current_user_id());

CREATE POLICY "Users can block others"
  ON "Block" FOR INSERT
  WITH CHECK ("blockerId" = get_current_user_id());

CREATE POLICY "Users can unblock"
  ON "Block" FOR DELETE
  USING ("blockerId" = get_current_user_id());


-- =====================================================================
-- 9. Tag (public reference data)
-- =====================================================================
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON "Tag" FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON "Tag" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================================
-- 10. PostTag
-- =====================================================================
ALTER TABLE "PostTag" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post tags"
  ON "PostTag" FOR SELECT
  USING (true);

CREATE POLICY "Users can tag own posts"
  ON "PostTag" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Post" WHERE "Post".id = "PostTag"."postId" AND "Post"."authorId" = get_current_user_id()
    )
  );


-- =====================================================================
-- 11. UserMention
-- =====================================================================
ALTER TABLE "UserMention" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentions"
  ON "UserMention" FOR SELECT
  USING (true);

CREATE POLICY "Users can create mentions"
  ON "UserMention" FOR INSERT
  WITH CHECK ("mentionerId" = get_current_user_id());


-- =====================================================================
-- 12. Conversation
-- =====================================================================
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own conversations"
  ON "Conversation" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Conversation".id
      AND "ConversationParticipant"."userId" = get_current_user_id()
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON "Conversation" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversation"
  ON "Conversation" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Conversation".id
      AND "ConversationParticipant"."userId" = get_current_user_id()
    )
  );


-- =====================================================================
-- 13. ConversationParticipant
-- =====================================================================
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own participation"
  ON "ConversationParticipant" FOR SELECT
  USING ("userId" = get_current_user_id());

CREATE POLICY "Authenticated users can add participants"
  ON "ConversationParticipant" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================================
-- 14. Message
-- =====================================================================
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see messages in own conversations"
  ON "Message" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Message"."conversationId"
      AND "ConversationParticipant"."userId" = get_current_user_id()
    )
  );

CREATE POLICY "Users can send messages in own conversations"
  ON "Message" FOR INSERT
  WITH CHECK (
    "senderId" = get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Message"."conversationId"
      AND "ConversationParticipant"."userId" = get_current_user_id()
    )
  );

CREATE POLICY "Receivers can update messages (mark read)"
  ON "Message" FOR UPDATE
  USING ("receiverId" = get_current_user_id());


-- =====================================================================
-- 15. Community
-- =====================================================================
ALTER TABLE "Community" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public communities"
  ON "Community" FOR SELECT
  USING ("isPrivate" = false);

CREATE POLICY "Members can view private communities"
  ON "Community" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "CommunityMember"
      WHERE "CommunityMember"."communityId" = "Community".id
      AND "CommunityMember"."userId" = get_current_user_id()
    )
  );

CREATE POLICY "Authenticated users can create communities"
  ON "Community" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Community creator can update"
  ON "Community" FOR UPDATE
  USING ("creatorId" = get_current_user_id());


-- =====================================================================
-- 16. CommunityMember
-- =====================================================================
ALTER TABLE "CommunityMember" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community members"
  ON "CommunityMember" FOR SELECT
  USING (true);

CREATE POLICY "Users can join communities"
  ON "CommunityMember" FOR INSERT
  WITH CHECK ("userId" = get_current_user_id());

CREATE POLICY "Users can leave communities"
  ON "CommunityMember" FOR DELETE
  USING ("userId" = get_current_user_id());


-- =====================================================================
-- 17. XpLog
-- =====================================================================
ALTER TABLE "XpLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own XP logs"
  ON "XpLog" FOR SELECT
  USING ("userId" = get_current_user_id());

-- Only backend can insert XP logs (no INSERT policy for REST API)


-- =====================================================================
-- 18. UserStats
-- =====================================================================
ALTER TABLE "UserStats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user stats (leaderboard)"
  ON "UserStats" FOR SELECT
  USING (true);

-- Only backend can update stats (no INSERT/UPDATE policy for REST API)


-- =====================================================================
-- 19. LeaderboardSnapshot
-- =====================================================================
ALTER TABLE "LeaderboardSnapshot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON "LeaderboardSnapshot" FOR SELECT
  USING (true);


-- =====================================================================
-- 20. Referral
-- =====================================================================
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own referrals"
  ON "Referral" FOR SELECT
  USING (
    "referrerId" = get_current_user_id()
    OR "referredId" = get_current_user_id()
  );


-- =====================================================================
-- 21. Mission
-- =====================================================================
ALTER TABLE "Mission" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active missions"
  ON "Mission" FOR SELECT
  USING ("isActive" = true);


-- =====================================================================
-- 22. MissionProgress
-- =====================================================================
ALTER TABLE "MissionProgress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own mission progress"
  ON "MissionProgress" FOR SELECT
  USING ("userId" = get_current_user_id());


-- =====================================================================
-- 23. WeeklyChallenge
-- =====================================================================
ALTER TABLE "WeeklyChallenge" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON "WeeklyChallenge" FOR SELECT
  USING ("isActive" = true);


-- =====================================================================
-- 24. ChallengeParticipation
-- =====================================================================
ALTER TABLE "ChallengeParticipation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own challenge participation"
  ON "ChallengeParticipation" FOR SELECT
  USING ("userId" = get_current_user_id());


-- =====================================================================
-- 25. Project
-- =====================================================================
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public projects"
  ON "Project" FOR SELECT
  USING (visibility = 'PUBLIC');

CREATE POLICY "Users can see own private projects"
  ON "Project" FOR SELECT
  USING ("authorId" = get_current_user_id());

CREATE POLICY "Users can create projects"
  ON "Project" FOR INSERT
  WITH CHECK ("authorId" = get_current_user_id());

CREATE POLICY "Users can update own projects"
  ON "Project" FOR UPDATE
  USING ("authorId" = get_current_user_id());

CREATE POLICY "Users can delete own projects"
  ON "Project" FOR DELETE
  USING ("authorId" = get_current_user_id());


-- =====================================================================
-- 26. KnowledgeEntry
-- =====================================================================
ALTER TABLE "KnowledgeEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge entries"
  ON "KnowledgeEntry" FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create entries"
  ON "KnowledgeEntry" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================================
-- 27. Notification
-- =====================================================================
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own notifications"
  ON "Notification" FOR SELECT
  USING ("recipientId" = get_current_user_id());

CREATE POLICY "Users can update own notifications (mark read)"
  ON "Notification" FOR UPDATE
  USING ("recipientId" = get_current_user_id());


-- =====================================================================
-- 28. Report
-- =====================================================================
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own reports"
  ON "Report" FOR SELECT
  USING ("reporterId" = get_current_user_id());

CREATE POLICY "Authenticated users can create reports"
  ON "Report" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================================
-- 29. Activity
-- =====================================================================
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own activity"
  ON "Activity" FOR SELECT
  USING ("userId" = get_current_user_id());


-- =====================================================================
-- 30. View
-- =====================================================================
ALTER TABLE "View" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to views"
  ON "View" FOR SELECT
  USING (false);

-- Only backend tracks views (no REST API access needed)


-- =====================================================================
-- 31. Feedback
-- =====================================================================
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own feedback"
  ON "Feedback" FOR SELECT
  USING ("userId" = get_current_user_id());

CREATE POLICY "Authenticated users can create feedback"
  ON "Feedback" FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =====================================================================
-- 32. FeedbackComment
-- =====================================================================
ALTER TABLE "FeedbackComment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see comments on own feedback"
  ON "FeedbackComment" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Feedback"
      WHERE "Feedback".id = "FeedbackComment"."feedbackId"
      AND "Feedback"."userId" = get_current_user_id()
    )
  );


-- =====================================================================
-- 33. BotAccount (admin only)
-- =====================================================================
ALTER TABLE "BotAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to bot accounts"
  ON "BotAccount" FOR SELECT
  USING (false);


-- =====================================================================
-- 34. BotActivity (admin only)
-- =====================================================================
ALTER TABLE "BotActivity" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to bot activity"
  ON "BotActivity" FOR SELECT
  USING (false);


-- =====================================================================
-- 35. AiLog (admin only)
-- =====================================================================
ALTER TABLE "AiLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to AI logs"
  ON "AiLog" FOR SELECT
  USING (false);


-- =====================================================================
-- 36. AuditLog (admin only)
-- =====================================================================
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to audit logs"
  ON "AuditLog" FOR SELECT
  USING (false);


-- =====================================================================
-- DONE! All 36 tables now have RLS enabled.
--
-- IMPORTANT NOTES:
-- 1. Your NestJS backend uses DATABASE_URL (postgres role)
--    → It BYPASSES RLS automatically. Your backend is unaffected.
--
-- 2. Frontend Supabase client uses anon key
--    → RLS applies. Currently only used for Realtime subscriptions.
--
-- 3. Anyone trying to access the REST API directly
--    → RLS blocks unauthorized access.
--
-- 4. To verify RLS is working, run:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- =====================================================================
