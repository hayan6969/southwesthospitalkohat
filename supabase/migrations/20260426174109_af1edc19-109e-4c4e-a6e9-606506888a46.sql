DROP POLICY IF EXISTS "Allow all operations" ON public.medicines;

CREATE POLICY "Allow all operations on medicines"
ON public.medicines
FOR ALL
USING (true)
WITH CHECK (true);