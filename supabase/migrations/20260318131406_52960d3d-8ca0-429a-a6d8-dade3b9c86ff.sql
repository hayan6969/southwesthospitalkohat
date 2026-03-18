
-- Add expires_at and used_at columns to patient_discounts
ALTER TABLE public.patient_discounts 
  ADD COLUMN expires_at timestamp with time zone,
  ADD COLUMN used_at timestamp with time zone;
