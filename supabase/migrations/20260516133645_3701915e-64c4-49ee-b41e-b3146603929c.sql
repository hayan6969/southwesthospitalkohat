ALTER TABLE public.ipd_admissions
  ADD COLUMN IF NOT EXISTS anesthesiologist_id UUID REFERENCES public.doctors(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ipd_admissions_anesthesiologist_id ON public.ipd_admissions(anesthesiologist_id);