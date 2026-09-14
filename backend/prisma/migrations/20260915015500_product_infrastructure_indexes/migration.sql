CREATE INDEX IF NOT EXISTS community_invites_inviter_idx
  ON public.community_invites(inviter_id);

CREATE INDEX IF NOT EXISTS community_join_requests_reviewer_idx
  ON public.community_join_requests(reviewed_by_id)
  WHERE reviewed_by_id IS NOT NULL;

-- Existing hot-path foreign keys surfaced by the Supabase advisor.
CREATE INDEX IF NOT EXISTS Message_senderId_idx
  ON public."Message"("senderId");
CREATE INDEX IF NOT EXISTS Message_replyToId_idx
  ON public."Message"("replyToId")
  WHERE "replyToId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS Post_communityId_idx
  ON public."Post"("communityId")
  WHERE "communityId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS Comment_authorId_idx
  ON public."Comment"("authorId");
CREATE INDEX IF NOT EXISTS Comment_parentId_idx
  ON public."Comment"("parentId")
  WHERE "parentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS Notification_senderId_idx
  ON public."Notification"("senderId");
