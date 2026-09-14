-- Supabase Realtime reads public tables with the JWT database role.
-- Map auth.uid() to the application's User.id without exposing the User table.
CREATE OR REPLACE FUNCTION public.current_devsocial_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM "User"
  WHERE "supabaseAuthId" = auth.uid()::text
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_devsocial_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_devsocial_user_id() TO authenticated;

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_participants_can_read" ON "Message";
CREATE POLICY "message_participants_can_read"
ON "Message"
FOR SELECT
TO authenticated
USING (
  "senderId" = public.current_devsocial_user_id()
  OR "receiverId" = public.current_devsocial_user_id()
);

-- Realtime only needs SELECT; mutations continue to go through the NestJS backend.
GRANT SELECT ON TABLE "Message" TO authenticated;

-- Ensure the table is part of Supabase Realtime without failing repeatable deployments.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication is not available in this environment';
END
$$;
