-- Update all patients that don't have patient_number to generate one
UPDATE public.patients 
SET patient_number = 'P-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::TEXT, 4, '0')
WHERE patient_number IS NULL OR patient_number = '';