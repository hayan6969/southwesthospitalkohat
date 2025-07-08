-- Add foreign key relationship between doctors and profiles tables
ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key relationship between patients and profiles tables  
ALTER TABLE public.patients 
ADD CONSTRAINT patients_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;