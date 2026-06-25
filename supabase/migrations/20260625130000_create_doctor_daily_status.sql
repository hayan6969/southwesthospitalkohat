CREATE TABLE IF NOT EXISTS public.doctor_daily_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_date date NOT NULL DEFAULT CURRENT_DATE,
  accepting_appointments boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id, status_date)
);

ALTER TABLE public.doctor_daily_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read doctor_daily_status" ON public.doctor_daily_status;
CREATE POLICY "Authenticated users can read doctor_daily_status"
  ON public.doctor_daily_status FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Doctors can upsert their own status" ON public.doctor_daily_status;
CREATE POLICY "Doctors can upsert their own status"
  ON public.doctor_daily_status FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their own status"
  ON public.doctor_daily_status FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid());
