CREATE TABLE IF NOT EXISTS public.anesthesia_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid,
  admission_id uuid,
  ot_booking_id uuid,
  surgical_procedure text,
  brief_history text,
  preop_hr numeric,
  preop_bp text,
  preop_spo2 numeric,
  preop_medication text,
  anesthesia_type text,
  anesthesia_drugs text,
  intraop_assessment jsonb DEFAULT '[]'::jsonb,
  input_output_notes text,
  recovery_status text,
  postop_orders jsonb DEFAULT '[]'::jsonb,
  postop_notes text,
  status text DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.anesthesia_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff manage anesthesia_notes"
  ON public.anesthesia_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor', 'ota', 'staff', 'ipd')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor', 'ota', 'staff', 'ipd')
    )
  );

CREATE POLICY "Nurses view anesthesia_notes"
  ON public.anesthesia_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('nursing', 'nurse', 'finance')
    )
  );

CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_ot_booking ON public.anesthesia_notes(ot_booking_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_admission ON public.anesthesia_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_notes_patient ON public.anesthesia_notes(patient_id);