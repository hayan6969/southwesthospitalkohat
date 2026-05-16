ALTER TABLE public.ipd_doctor_payments ALTER COLUMN admission_id DROP NOT NULL;
ALTER TABLE public.ipd_doctor_payments ALTER COLUMN charge_type SET DEFAULT 'aggregate';