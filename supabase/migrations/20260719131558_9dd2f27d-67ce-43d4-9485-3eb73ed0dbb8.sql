CREATE TABLE public.client_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  route TEXT,
  user_agent TEXT,
  url TEXT,
  extra JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_error_logs_occurred_at ON public.client_error_logs (occurred_at DESC);
CREATE INDEX idx_client_error_logs_user_id ON public.client_error_logs (user_id);
CREATE INDEX idx_client_error_logs_level ON public.client_error_logs (level);

GRANT SELECT, INSERT ON public.client_error_logs TO authenticated;
GRANT INSERT ON public.client_error_logs TO anon;
GRANT ALL ON public.client_error_logs TO service_role;

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can insert logs so we capture pre-login errors too
CREATE POLICY "Anyone can insert client error logs"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins/super_admins can read logs
CREATE POLICY "Admins can read client error logs"
  ON public.client_error_logs FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');