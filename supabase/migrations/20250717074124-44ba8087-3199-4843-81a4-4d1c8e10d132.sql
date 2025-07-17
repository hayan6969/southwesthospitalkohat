-- Add cleared status to appointments table for tracking cleared free appointments
ALTER TABLE public.appointments 
ADD COLUMN cleared_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;