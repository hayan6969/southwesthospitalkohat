-- Fix RLS policies to remove 'nursing' role since it doesn't exist in the type system
-- Update assessment entries policies to use only valid roles

DROP POLICY IF EXISTS "Staff and nursing can create assessment entries" ON public.assessment_entries;
DROP POLICY IF EXISTS "Medical staff can update assessment entries" ON public.assessment_entries;
DROP POLICY IF EXISTS "Medical staff can delete assessment entries" ON public.assessment_entries;

-- Create updated policies with only valid roles
CREATE POLICY "Staff can create assessment entries" 
ON public.assessment_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'admin')
));

CREATE POLICY "Medical staff can update assessment entries" 
ON public.assessment_entries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'doctor', 'ota', 'admin')
));

CREATE POLICY "Medical staff can delete assessment entries" 
ON public.assessment_entries 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'doctor', 'ota', 'admin')
));