-- Update RLS policy to allow nursing role to create treatment chart entries
DROP POLICY IF EXISTS "Staff can create treatment chart entries" ON public.treatment_chart_entries;

CREATE POLICY "Staff and nursing can create treatment chart entries" 
ON public.treatment_chart_entries 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'nursing')
  )
);

-- Also update the update and delete policies to include nursing
DROP POLICY IF EXISTS "Medical staff can update treatment chart entries" ON public.treatment_chart_entries;
DROP POLICY IF EXISTS "Medical staff can delete treatment chart entries" ON public.treatment_chart_entries;

CREATE POLICY "Medical staff can update treatment chart entries" 
ON public.treatment_chart_entries 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
  )
);

CREATE POLICY "Medical staff can delete treatment chart entries" 
ON public.treatment_chart_entries 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
  )
);