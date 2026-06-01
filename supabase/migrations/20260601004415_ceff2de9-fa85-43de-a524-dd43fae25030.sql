DROP POLICY IF EXISTS "Admins can manage lab test types" ON public.lab_test_types;

CREATE POLICY "Staff can manage lab test types"
ON public.lab_test_types
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab','lab_technician','staff','doctor')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','lab','lab_technician','staff','doctor')));