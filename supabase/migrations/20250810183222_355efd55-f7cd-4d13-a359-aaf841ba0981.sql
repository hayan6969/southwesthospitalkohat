-- Add emergency_patient_data column to invoices table to store actual patient info for emergency consultations
ALTER TABLE public.invoices 
ADD COLUMN emergency_patient_data JSONB;