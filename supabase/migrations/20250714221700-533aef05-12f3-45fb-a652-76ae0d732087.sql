-- Allow external doctors by making doctor_id nullable and adding external_doctor_name field
ALTER TABLE public.lab_reports 
ALTER COLUMN doctor_id DROP NOT NULL;

-- Add external doctor name field for cases where doctor is not in our system
ALTER TABLE public.lab_reports 
ADD COLUMN external_doctor_name TEXT;

-- Add a check constraint to ensure either doctor_id or external_doctor_name is provided
ALTER TABLE public.lab_reports 
ADD CONSTRAINT lab_reports_doctor_check 
CHECK (
  (doctor_id IS NOT NULL AND external_doctor_name IS NULL) OR 
  (doctor_id IS NULL AND external_doctor_name IS NOT NULL)
);