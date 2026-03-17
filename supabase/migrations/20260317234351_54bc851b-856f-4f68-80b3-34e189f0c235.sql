
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS province text DEFAULT NULL;
ALTER TABLE public.patients DROP COLUMN IF EXISTS area;
