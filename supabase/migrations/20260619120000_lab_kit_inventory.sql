-- ============================================================================
-- Lab Kit Inventory: per-batch stock with test capacity, FEFO consumption,
-- test->kit links, and a consumption audit log.
-- ============================================================================

-- Ensure the shared updated_at trigger function exists (idempotent).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Extend the kit/reagent master (lab_inventory_items)
-- ----------------------------------------------------------------------------
ALTER TABLE public.lab_inventory_items
  ADD COLUMN IF NOT EXISTS default_tests_per_unit INTEGER,
  ADD COLUMN IF NOT EXISTS track_by_tests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_tests_level INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 2. Received lots (batches) — the FEFO source of truth for on-hand tests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE,
  batch_number TEXT,
  manufacturing_date DATE,
  expiry_date DATE,
  units_received INTEGER NOT NULL DEFAULT 1,
  tests_per_unit INTEGER NOT NULL DEFAULT 1,
  tests_total INTEGER NOT NULL DEFAULT 0,
  tests_remaining INTEGER NOT NULL DEFAULT 0,
  received_by UUID,
  request_id UUID,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_stock_batches_item ON public.lab_stock_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_lab_stock_batches_expiry ON public.lab_stock_batches(expiry_date);

DROP TRIGGER IF EXISTS update_lab_stock_batches_updated_at ON public.lab_stock_batches;
CREATE TRIGGER update_lab_stock_batches_updated_at
  BEFORE UPDATE ON public.lab_stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. Which kit(s) a lab test consumes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_test_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type_id UUID NOT NULL REFERENCES public.lab_test_types(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.lab_inventory_items(id) ON DELETE CASCADE,
  tests_per_run INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_type_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_test_consumables_test ON public.lab_test_consumables(test_type_id);

-- ----------------------------------------------------------------------------
-- 4. Consumption audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_stock_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.lab_stock_batches(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.lab_inventory_items(id) ON DELETE SET NULL,
  test_type_id UUID REFERENCES public.lab_test_types(id) ON DELETE SET NULL,
  report_id UUID,
  tests_consumed INTEGER NOT NULL DEFAULT 1,
  consumed_by UUID,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_stock_consumption_report ON public.lab_stock_consumption(report_id);
CREATE INDEX IF NOT EXISTS idx_lab_stock_consumption_item ON public.lab_stock_consumption(item_id);

-- ----------------------------------------------------------------------------
-- 5. Atomic FEFO consumption function
--    Deducts p_tests from the soonest-to-expire active, non-expired batches of
--    an item and logs each deduction. Returns the number actually consumed
--    (may be < requested if there isn't enough usable stock).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_lab_test_stock(
  p_item_id UUID,
  p_tests INTEGER,
  p_test_type_id UUID DEFAULT NULL,
  p_report_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER := p_tests;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_tests IS NULL OR p_tests <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, tests_remaining
    FROM public.lab_stock_batches
    WHERE item_id = p_item_id
      AND is_active
      AND tests_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.tests_remaining, v_remaining);
    UPDATE public.lab_stock_batches
      SET tests_remaining = tests_remaining - v_take
      WHERE id = b.id;
    INSERT INTO public.lab_stock_consumption
      (batch_id, item_id, test_type_id, report_id, tests_consumed, consumed_by)
      VALUES (b.id, p_item_id, p_test_type_id, p_report_id, v_take, auth.uid());
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_tests - v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_lab_test_stock(UUID, INTEGER, UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.lab_stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_stock_consumption ENABLE ROW LEVEL SECURITY;

-- Batches: everyone authenticated can view; lab/store/manager/admin can manage.
DROP POLICY IF EXISTS "view lab batches" ON public.lab_stock_batches;
CREATE POLICY "view lab batches" ON public.lab_stock_batches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "manage lab batches" ON public.lab_stock_batches;
CREATE POLICY "manage lab batches" ON public.lab_stock_batches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('lab', 'inventory_manager', 'store', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('lab', 'inventory_manager', 'store', 'admin')));

-- Test->kit links: everyone authenticated can view; lab/admin can manage.
DROP POLICY IF EXISTS "view test consumables" ON public.lab_test_consumables;
CREATE POLICY "view test consumables" ON public.lab_test_consumables
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "manage test consumables" ON public.lab_test_consumables;
CREATE POLICY "manage test consumables" ON public.lab_test_consumables
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('lab', 'inventory_manager', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND p.role IN ('lab', 'inventory_manager', 'admin')));

-- Consumption log: everyone authenticated can view; inserts happen via the
-- SECURITY DEFINER function, but allow direct inserts by authenticated too.
DROP POLICY IF EXISTS "view lab consumption" ON public.lab_stock_consumption;
CREATE POLICY "view lab consumption" ON public.lab_stock_consumption
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert lab consumption" ON public.lab_stock_consumption;
CREATE POLICY "insert lab consumption" ON public.lab_stock_consumption
  FOR INSERT TO authenticated WITH CHECK (true);
