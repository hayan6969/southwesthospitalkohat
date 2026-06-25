-- Per-doctor prescription slip template (letterhead + toggles)
-- Part of Round 2 improvements (see docs/PRESCRIPTION_SLIP_IMPROVEMENTS.md)
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS prescription_template jsonb;

COMMENT ON COLUMN public.doctors.prescription_template IS
  'JSONB shape: { title_prefix, degrees, credentials[], urdu_name, urdu_lines[], pa_phone, footer_text, show_token, show_fee, show_qr }';
