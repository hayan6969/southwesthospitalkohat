ALTER TABLE public.ipd_admissions
  ADD COLUMN IF NOT EXISTS investigation TEXT,
  ADD COLUMN IF NOT EXISTS pa_exam TEXT,
  ADD COLUMN IF NOT EXISTS ua_exam TEXT,
  ADD COLUMN IF NOT EXISTS procedure_performed TEXT,
  ADD COLUMN IF NOT EXISTS treatment_given TEXT,
  ADD COLUMN IF NOT EXISTS complication TEXT,
  ADD COLUMN IF NOT EXISTS condition_of_discharge TEXT,
  ADD COLUMN IF NOT EXISTS advice_for_home TEXT;

NOTIFY pgrst, 'reload schema';