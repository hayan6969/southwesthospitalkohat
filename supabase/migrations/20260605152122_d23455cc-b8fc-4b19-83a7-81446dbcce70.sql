DROP POLICY IF EXISTS "Admins can manage lab test parameters" ON public.lab_test_parameters;
CREATE POLICY "Staff can manage lab test parameters"
ON public.lab_test_parameters FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin','lab','lab_technician','staff','doctor'])))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin','lab','lab_technician','staff','doctor'])));

DROP POLICY IF EXISTS "Admins can manage parameter subranges" ON public.lab_parameter_subranges;
CREATE POLICY "Staff can manage parameter subranges"
ON public.lab_parameter_subranges FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin','lab','lab_technician','staff','doctor'])))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin','lab','lab_technician','staff','doctor'])));