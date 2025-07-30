-- Update the check constraint on profiles table to include 'nursing' role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the updated constraint with nursing role
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'doctor', 'staff', 'ota', 'nursing', 'head_pharmacist', 'assistant_pharmacist', 'salesman_pharmacist', 'finance', 'patient'));