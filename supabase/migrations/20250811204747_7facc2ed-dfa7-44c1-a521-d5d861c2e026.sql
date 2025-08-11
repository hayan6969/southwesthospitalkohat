-- Update RLS policies to include nursing role for assessment entries

DROP POLICY IF EXISTS "Staff can create assessment entries" ON public.assessment_entries;

-- Create updated policy including nursing role
CREATE POLICY "Medical staff can create assessment entries" 
ON public.assessment_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'admin', 'nursing', 'ota')
));