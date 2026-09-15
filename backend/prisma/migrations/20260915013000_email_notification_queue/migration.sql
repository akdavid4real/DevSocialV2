CREATE TABLE IF NOT EXISTS public.email_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public."Notification"(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  event_key text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  action_url text,
  frequency text NOT NULL CHECK (frequency IN ('INSTANT','HOURLY','DAILY','WEEKLY')),
  deliver_after timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT email_notification_queue_notification_unique UNIQUE (notification_id)
);

CREATE INDEX IF NOT EXISTS email_notification_queue_due_idx
  ON public.email_notification_queue(status, deliver_after, created_at)
  WHERE status IN ('PENDING','FAILED');
CREATE INDEX IF NOT EXISTS email_notification_queue_recipient_idx
  ON public.email_notification_queue(recipient_id, status, deliver_after);

ALTER TABLE public.email_notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_notification_queue FROM anon, authenticated;
