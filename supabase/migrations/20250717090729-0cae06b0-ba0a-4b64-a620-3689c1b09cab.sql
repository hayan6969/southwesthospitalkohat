-- Clean up orphaned audit log entries first
DELETE FROM public.audit_logs 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM public.profiles);

-- Add foreign key relationship between audit_logs and profiles
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;