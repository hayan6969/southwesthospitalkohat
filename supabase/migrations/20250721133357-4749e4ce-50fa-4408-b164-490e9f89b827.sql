-- Update existing pharmacy roles to head_pharmacist and add new pharmacy roles
-- First, update all existing pharmacy users to head_pharmacist
UPDATE public.profiles 
SET role = 'head_pharmacist' 
WHERE role = 'pharmacy';

-- Add comment to track the change
COMMENT ON COLUMN public.profiles.role IS 'User role: patient, doctor, staff, admin, finance, head_pharmacist, assistant_pharmacist, salesman_pharmacist';