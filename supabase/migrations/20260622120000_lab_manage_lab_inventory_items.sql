-- ============================================================================
-- Fix: the `lab` role could not add / edit / delete lab inventory (kit/reagent)
-- master items, so LabStockManager writes returned 403.
--
-- The original lab_inventory_items policies (20260318*) only granted manage
-- rights to inventory_manager / admin / store. The kit-inventory work
-- (20260619120000) gave `lab` manage rights on the *related* tables
-- (lab_stock_batches, lab_test_consumables) but not on the master table itself.
--
-- SELECT is already open to everyone ("Everyone can view lab inventory items"),
-- so this only adds the missing write access for the lab role.
-- ============================================================================

DROP POLICY IF EXISTS "Lab can manage lab inventory items" ON public.lab_inventory_items;
CREATE POLICY "Lab can manage lab inventory items"
  ON public.lab_inventory_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'lab'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'lab'));
