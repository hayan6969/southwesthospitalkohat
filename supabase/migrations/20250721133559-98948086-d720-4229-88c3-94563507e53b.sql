-- Drop the existing role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Create new constraint with pharmacy hierarchy roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'doctor'::text, 'staff'::text, 'head_pharmacist'::text, 'assistant_pharmacist'::text, 'salesman_pharmacist'::text, 'patient'::text, 'finance'::text]));

-- Update existing pharmacy roles to head_pharmacist
UPDATE public.profiles 
SET role = 'head_pharmacist' 
WHERE role = 'pharmacy';