-- Add ot_notes column to ot_schedules table to store operation notes
ALTER TABLE public.ot_schedules 
ADD COLUMN ot_notes JSONB DEFAULT NULL;