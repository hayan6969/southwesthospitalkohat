-- Create profiles for existing patients that don't have profiles
INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, created_at, updated_at)
SELECT 
  p.id,
  COALESCE('patient_' || p.id || '@temp.com') as email,
  'Patient' as first_name,
  p.id as last_name,
  NULL as phone,
  'patient' as role,
  NOW() as created_at,
  NOW() as updated_at
FROM public.patients p
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles pr WHERE pr.id = p.id
);

-- Create profiles for existing doctors that don't have profiles  
INSERT INTO public.profiles (id, email, first_name, last_name, phone, role, created_at, updated_at)
SELECT 
  d.id,
  COALESCE('doctor_' || d.id || '@temp.com') as email,
  'Doctor' as first_name,
  d.id as last_name,
  NULL as phone,
  'doctor' as role,
  NOW() as created_at,
  NOW() as updated_at
FROM public.doctors d
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles pr WHERE pr.id = d.id
);