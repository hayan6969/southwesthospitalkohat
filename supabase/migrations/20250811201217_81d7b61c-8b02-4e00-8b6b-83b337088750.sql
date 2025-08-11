-- Add new columns to treatment_chart_entries table
ALTER TABLE public.treatment_chart_entries 
ADD COLUMN blood_pressure TEXT,
ADD COLUMN pulses TEXT,
ADD COLUMN temperature TEXT,
ADD COLUMN input_data TEXT,
ADD COLUMN output_data TEXT,
ADD COLUMN remarks TEXT;

-- Remove the old medicine and investigation columns since we're changing the structure
ALTER TABLE public.treatment_chart_entries 
DROP COLUMN medicine,
DROP COLUMN investigation;