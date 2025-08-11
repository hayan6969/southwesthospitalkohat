-- Revert treatment_chart_entries to original structure
ALTER TABLE public.treatment_chart_entries 
DROP COLUMN IF EXISTS blood_pressure,
DROP COLUMN IF EXISTS pulses,
DROP COLUMN IF EXISTS temperature,
DROP COLUMN IF EXISTS input_data,
DROP COLUMN IF EXISTS output_data,
DROP COLUMN IF EXISTS remarks;

-- Add back original columns
ALTER TABLE public.treatment_chart_entries 
ADD COLUMN medicine text,
ADD COLUMN investigation text;