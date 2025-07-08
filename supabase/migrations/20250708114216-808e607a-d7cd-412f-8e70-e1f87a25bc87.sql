-- First, create profiles for existing doctors that don't have them
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
    d.id,
    COALESCE(d.license_number, d.id::text) || '@doctor.local' as email,
    'Doctor' as first_name,
    d.specialization as last_name,
    'doctor' as role
FROM public.doctors d
LEFT JOIN public.profiles p ON d.id = p.id
WHERE p.id IS NULL;

-- Create profiles for existing patients that don't have them
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
    pat.id,
    COALESCE(pat.cnic, pat.id::text) || '@patient.local' as email,
    'Patient' as first_name,
    COALESCE(pat.patient_number, pat.id::text) as last_name,
    'patient' as role
FROM public.patients pat
LEFT JOIN public.profiles p ON pat.id = p.id
WHERE p.id IS NULL;

-- Now add the foreign key relationships
ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.patients 
ADD CONSTRAINT patients_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;