-- Add emergency rate to hospital settings
ALTER TABLE public.hospital_settings 
ADD COLUMN emergency_consultation_fee NUMERIC DEFAULT 10000;