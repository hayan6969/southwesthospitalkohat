-- Check current RLS policies for ot_schedules
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'ot_schedules';

-- Update the RLS policy to be more permissive for staff users viewing OT schedules
DROP POLICY IF EXISTS "Staff and admins can manage OT schedules" ON public.ot_schedules;

-- Create a more specific policy for staff to view OT schedules
CREATE POLICY "Staff can view all OT schedules" 
ON public.ot_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['staff'::text, 'admin'::text])
  )
);

-- Create a policy for staff to manage OT schedules
CREATE POLICY "Staff and admins can manage OT schedules" 
ON public.ot_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['staff'::text, 'admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['staff'::text, 'admin'::text])
  )
);