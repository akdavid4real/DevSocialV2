CREATE OR REPLACE FUNCTION public.cancel_pending_access_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.follow_requests
  SET status = 'CANCELLED', responded_at = now()
  WHERE status = 'PENDING'
    AND (
      (requester_id = NEW."blockerId" AND target_id = NEW."blockedId")
      OR
      (requester_id = NEW."blockedId" AND target_id = NEW."blockerId")
    );

  UPDATE public.community_invites
  SET status = 'CANCELLED', responded_at = now()
  WHERE status = 'PENDING'
    AND (
      (inviter_id = NEW."blockerId" AND invitee_id = NEW."blockedId")
      OR
      (inviter_id = NEW."blockedId" AND invitee_id = NEW."blockerId")
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_access_on_block() FROM PUBLIC;

DROP TRIGGER IF EXISTS block_cancel_pending_access ON public."Block";
CREATE TRIGGER block_cancel_pending_access
AFTER INSERT ON public."Block"
FOR EACH ROW EXECUTE FUNCTION public.cancel_pending_access_on_block();
