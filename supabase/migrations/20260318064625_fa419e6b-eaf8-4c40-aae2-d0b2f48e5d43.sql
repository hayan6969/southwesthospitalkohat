-- Update lab_reports RLS to allow lab role to manage reports
DROP POLICY IF EXISTS "Allow all operations" ON public.lab_reports;

CREATE POLICY "Everyone can view lab reports"
ON public.lab_reports FOR SELECT
TO public
USING (true);

CREATE POLICY "Staff admin lab can insert lab reports"
ON public.lab_reports FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff', 'lab', 'doctor')
  )
);

CREATE POLICY "Staff admin lab can update lab reports"
ON public.lab_reports FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff', 'lab', 'doctor')
  )
);

CREATE POLICY "Admin can delete lab reports"
ON public.lab_reports FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);