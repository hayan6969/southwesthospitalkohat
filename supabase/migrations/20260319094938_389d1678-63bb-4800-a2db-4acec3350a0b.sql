
-- Add shift column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift text DEFAULT null;

-- Add shift timing settings to hospital_settings
ALTER TABLE public.hospital_settings ADD COLUMN IF NOT EXISTS morning_shift_start time DEFAULT '08:00:00';
ALTER TABLE public.hospital_settings ADD COLUMN IF NOT EXISTS morning_shift_end time DEFAULT '14:00:00';
ALTER TABLE public.hospital_settings ADD COLUMN IF NOT EXISTS evening_shift_start time DEFAULT '14:00:00';
ALTER TABLE public.hospital_settings ADD COLUMN IF NOT EXISTS evening_shift_end time DEFAULT '22:00:00';

-- Create staff shift closings table
CREATE TABLE public.staff_shift_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift text NOT NULL,
  closing_date date NOT NULL,
  shift_start_time timestamptz,
  shift_end_time timestamptz,
  total_revenue numeric DEFAULT 0,
  opd_revenue numeric DEFAULT 0,
  lab_revenue numeric DEFAULT 0,
  xray_revenue numeric DEFAULT 0,
  ot_revenue numeric DEFAULT 0,
  emergency_revenue numeric DEFAULT 0,
  misc_revenue numeric DEFAULT 0,
  total_invoices integer DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  overtime_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  notes text,
  summary_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_shift_closings ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_shift_closings
CREATE POLICY "Staff can view their own shift closings"
  ON public.staff_shift_closings FOR SELECT
  USING (staff_id = auth.uid());

CREATE POLICY "Staff can create their own shift closings"
  ON public.staff_shift_closings FOR INSERT
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Finance and admin can view all shift closings"
  ON public.staff_shift_closings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

CREATE POLICY "Finance and admin can update shift closings"
  ON public.staff_shift_closings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('finance', 'admin')));

CREATE POLICY "Admin can delete shift closings"
  ON public.staff_shift_closings FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
