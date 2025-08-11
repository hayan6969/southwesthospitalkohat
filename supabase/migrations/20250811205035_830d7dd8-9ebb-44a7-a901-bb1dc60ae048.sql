-- Update RLS policy to only allow nursing and admin roles to create assessment entries

DROP POLICY IF EXISTS "Medical staff can create assessment entries" ON public.assessment_entries;

-- Create policy allowing only nursing and admin to create assessment entries
CREATE POLICY "Nursing staff can create assessment entries" 
ON public.assessment_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'nursing')
));