-- Drop the existing constraint first
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update pharmacy roles without constraint 
UPDATE public.profiles 
SET role = 'head_pharmacist' 
WHERE role = 'pharmacy';

-- Add new constraint with pharmacy hierarchy
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'doctor'::text, 'staff'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'patient'::text, 'finance'::text]));