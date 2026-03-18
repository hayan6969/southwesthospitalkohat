
-- Allow store role to manage inventory_items
CREATE POLICY "Store can manage inventory items"
ON public.inventory_items
FOR ALL
TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store'));

-- Allow store role to manage lab_inventory_items
CREATE POLICY "Store can manage lab inventory items"
ON public.lab_inventory_items
FOR ALL
TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store'));
