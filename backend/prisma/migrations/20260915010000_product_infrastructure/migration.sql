-- Product infrastructure follow-ups: private follow/community workflows,
-- durable asset ownership, project-view analytics, and security telemetry.
-- These tables are backend-owned. RLS is enabled defensively and direct
-- anon/authenticated Data API access is revoked.

CREATE TABLE IF NOT EXISTS public.follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT follow_requests_not_self CHECK (requester_id <> target_id),
  CONSTRAINT follow_requests_pair_unique UNIQUE (requester_id, target_id)
);
CREATE INDEX IF NOT EXISTS follow_requests_target_status_idx ON public.follow_requests(target_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS follow_requests_requester_status_idx ON public.follow_requests(requester_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  reviewed_by_id uuid REFERENCES public."User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT community_join_requests_pair_unique UNIQUE (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_join_requests_community_status_idx ON public.community_join_requests(community_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_join_requests_user_status_idx ON public.community_join_requests(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public."Community"(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT community_invites_not_self CHECK (inviter_id <> invitee_id),
  CONSTRAINT community_invites_pair_unique UNIQUE (community_id, invitee_id)
);
CREATE INDEX IF NOT EXISTS community_invites_invitee_status_idx ON public.community_invites(invitee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_invites_community_status_idx ON public.community_invites(community_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'SUPABASE',
  bucket text NOT NULL,
  object_key text NOT NULL UNIQUE,
  public_url text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes >= 0),
  status text NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','ATTACHED','DELETED')),
  attached_to_type text,
  attached_to_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attached_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS assets_owner_status_idx ON public.assets(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS assets_attachment_idx ON public.assets(attached_to_type, attached_to_id);
CREATE INDEX IF NOT EXISTS assets_orphan_idx ON public.assets(status, created_at) WHERE status = 'UPLOADED';

CREATE TABLE IF NOT EXISTS public.project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public."Project"(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public."User"(id) ON DELETE SET NULL,
  visitor_key text NOT NULL,
  viewed_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_views_daily_unique UNIQUE (project_id, visitor_key, viewed_on)
);
CREATE INDEX IF NOT EXISTS project_views_project_created_idx ON public.project_views(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_views_viewer_created_idx ON public.project_views(viewer_id, created_at DESC) WHERE viewer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('LOGIN','PASSWORD_CHANGED','SESSION_REVOKED','ALL_SESSIONS_REVOKED','ACCOUNT_DELETION_REQUESTED')),
  session_id text,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_user_created_idx ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_type_created_idx ON public.security_events(event_type, created_at DESC);

-- Keep updated_at reliable for tables that can be reused/reopened.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follow_requests_touch_updated_at ON public.follow_requests;
CREATE TRIGGER follow_requests_touch_updated_at BEFORE UPDATE ON public.follow_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS community_join_requests_touch_updated_at ON public.community_join_requests;
CREATE TRIGGER community_join_requests_touch_updated_at BEFORE UPDATE ON public.community_join_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS community_invites_touch_updated_at ON public.community_invites;
CREATE TRIGGER community_invites_touch_updated_at BEFORE UPDATE ON public.community_invites
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS assets_touch_updated_at ON public.assets;
CREATE TRIGGER assets_touch_updated_at BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Backend-owned tables: deny browser/mobile Data API access even if public is exposed.
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.follow_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.community_join_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.community_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.assets FROM anon, authenticated;
REVOKE ALL ON TABLE public.project_views FROM anon, authenticated;
REVOKE ALL ON TABLE public.security_events FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
