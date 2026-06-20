-- ============================================================================
-- Store lab stock: a batch-wise bulk inventory held by the STORE, kept separate
-- from the LAB's on-hand stock (lab_stock_batches). The store tracks UNITS
-- (bottles/boxes); when units are dispatched to the lab, the lab receives them
-- and converts units -> tests (units * tests_per_unit) in lab_stock_batches.
-- ============================================================================

-- Shared updated_at trigger fn (idempotent — also defined in earlier migrations).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Store batches — FEFO source of truth for the store's bulk lab stock (units)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_store_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE,
  batch_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  units_received INTEGER NOT NULL DEFAULT 1,
  units_remaining INTEGER NOT NULL DEFAULT 0,
  tests_per_unit INTEGER NOT NULL DEFAULT 1,
  received_by UUID,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_store_batches_item ON public.lab_store_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_lab_store_batches_expiry ON public.lab_store_batches(expiry_date);

DROP TRIGGER IF EXISTS update_lab_store_batches_updated_at ON public.lab_store_batches;
CREATE TRIGGER update_lab_store_batches_updated_at
  BEFORE UPDATE ON public.lab_store_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. Atomic FEFO dispatch from store stock (units only).
--    Deducts p_units from the soonest-to-expire active, non-expired store
--    batches of an item. Does NOT create the lab batch — the lab's "Receive"
--    step records the lab batch (lab_stock_batches) on physical arrival.
--    Returns the number of units actually dispatched (may be < requested).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_lab_store_to_lab(
  p_item_id UUID,
  p_units INTEGER,
  p_request_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER := p_units;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_units IS NULL OR p_units <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, units_remaining
    FROM public.lab_store_batches
    WHERE item_id = p_item_id
      AND is_active
      AND units_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.units_remaining, v_remaining);
    UPDATE public.lab_store_batches
      SET units_remaining = units_remaining - v_take
      WHERE id = b.id;
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_units - v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_lab_store_to_lab(UUID, INTEGER, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security — view: any authenticated; manage: store/manager/admin
--    (lab staff must NOT edit store stock).
-- ----------------------------------------------------------------------------
ALTER TABLE public.lab_store_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view lab store batches" ON public.lab_store_batches;
CREATE POLICY "view lab store batches" ON public.lab_store_batches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "manage lab store batches" ON public.lab_store_batches;
CREATE POLICY "manage lab store batches" ON public.lab_store_batches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('store', 'inventory_manager', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('store', 'inventory_manager', 'admin')));
