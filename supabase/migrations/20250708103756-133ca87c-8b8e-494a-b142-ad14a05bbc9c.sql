-- Fix foreign key relationships between tables and profiles
-- First, ensure the foreign keys exist

-- Add foreign key for patients table to profiles
ALTER TABLE public.patients 
DROP CONSTRAINT IF EXISTS patients_id_fkey;

ALTER TABLE public.patients 
ADD CONSTRAINT patients_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for doctors table to profiles  
ALTER TABLE public.doctors
DROP CONSTRAINT IF EXISTS doctors_id_fkey;

ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for audit_logs to profiles
ALTER TABLE public.audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;