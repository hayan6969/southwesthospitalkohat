-- Add logo_url field to hospital_settings table
ALTER TABLE public.hospital_settings 
ADD COLUMN logo_url TEXT;