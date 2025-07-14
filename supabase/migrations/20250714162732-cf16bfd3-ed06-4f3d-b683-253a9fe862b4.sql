-- Remove the foreign key constraint from payroll_templates to allow manual employee entries
-- that don't need to reference the profiles table

ALTER TABLE public.payroll_templates 
DROP CONSTRAINT IF EXISTS payroll_templates_employee_id_fkey;

-- Add a comment to clarify that employee_id can be either a profile reference or a manual UUID
COMMENT ON COLUMN public.payroll_templates.employee_id IS 'UUID that can reference profiles.id for existing employees or be a standalone UUID for manual entries';