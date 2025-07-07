
-- Add foreign key constraints to link patients and doctors to profiles
ALTER TABLE public.patients 
ADD CONSTRAINT patients_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_id_fkey 
FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also add foreign key for audit_logs to profiles for user information
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
