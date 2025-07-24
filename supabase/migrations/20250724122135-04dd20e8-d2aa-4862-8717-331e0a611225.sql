-- Drop the existing role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recreate the constraint with the 'ota' role included
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY[
  'admin'::text, 
  'doctor'::text, 
  'staff'::text, 
  'ota'::text,
  'head_pharmacist'::text, 
  'assistant_pharmacist'::text, 
  'salesman_pharmacist'::text, 
  'patient'::text, 
  'finance'::text
]));