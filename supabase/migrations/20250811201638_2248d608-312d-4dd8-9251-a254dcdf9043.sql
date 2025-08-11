-- Drop existing policies and create new ones with proper permissions
DROP POLICY IF EXISTS "Doctors can create treatment chart entries" ON public.treatment_chart_entries;
DROP POLICY IF EXISTS "Doctors can delete treatment chart entries" ON public.treatment_chart_entries;
DROP POLICY IF EXISTS "Doctors can update treatment chart entries" ON public.treatment_chart_entries;
DROP POLICY IF EXISTS "Users can view treatment chart entries" ON public.treatment_chart_entries;

-- Allow everyone (authenticated users) to view treatment chart entries
CREATE POLICY "Everyone can view treatment chart entries" 
ON public.treatment_chart_entries 
FOR SELECT 
TO authenticated
USING (true);

-- Only staff (nurses) can create treatment chart entries
CREATE POLICY "Staff can create treatment chart entries" 
ON public.treatment_chart_entries 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'staff'
  )
);

-- Staff, doctors, OTA, and admins can update treatment chart entries
CREATE POLICY "Medical staff can update treatment chart entries" 
ON public.treatment_chart_entries 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'doctor', 'ota', 'admin')
  )
);

-- Staff, doctors, OTA, and admins can delete treatment chart entries
CREATE POLICY "Medical staff can delete treatment chart entries" 
ON public.treatment_chart_entries 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('staff', 'doctor', 'ota', 'admin')
  )
);