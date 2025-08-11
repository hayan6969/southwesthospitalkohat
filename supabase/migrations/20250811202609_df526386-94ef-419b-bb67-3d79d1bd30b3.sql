-- Update RLS policies for postop_progress_entries to include nursing role
DROP POLICY IF EXISTS "Staff can create postop progress entries" ON public.postop_progress_entries;

CREATE POLICY "Staff and nursing can create postop progress entries" 
ON public.postop_progress_entries 
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
DROP POLICY IF EXISTS "Medical staff can update postop progress entries" ON public.postop_progress_entries;
DROP POLICY IF EXISTS "Medical staff can delete postop progress entries" ON public.postop_progress_entries;

CREATE POLICY "Medical staff can update postop progress entries" 
ON public.postop_progress_entries 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
  )
);

CREATE POLICY "Medical staff can delete postop progress entries" 
ON public.postop_progress_entries 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
  )
);