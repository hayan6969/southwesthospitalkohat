CREATE POLICY "Finance users can update daily closings"
ON public.daily_closings
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['finance','admin','super_admin'])))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['finance','admin','super_admin'])));
GRANT UPDATE ON public.daily_closings TO authenticated;