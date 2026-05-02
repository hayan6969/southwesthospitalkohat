-- 1. Price on lab_test_types
ALTER TABLE public.lab_test_types
  ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0;

-- 2. Pathology orders (staff-created at billing, picked up by lab)
CREATE TABLE IF NOT EXISTS public.lab_pathology_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL,
  invoice_id UUID,
  referred_by TEXT,
  sample_type TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  lab_status TEXT NOT NULL DEFAULT 'awaiting_payment', -- awaiting_payment | ready | in_progress | reported | cancelled
  report_id UUID, -- set once lab finalizes a pathology report from this order
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_pathology_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.lab_pathology_orders(id) ON DELETE CASCADE,
  test_type_id UUID NOT NULL,
  test_name_snapshot TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pathology_orders_patient ON public.lab_pathology_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_payment ON public.lab_pathology_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_pathology_orders_lab_status ON public.lab_pathology_orders(lab_status);
CREATE INDEX IF NOT EXISTS idx_pathology_order_items_order ON public.lab_pathology_order_items(order_id);

ALTER TABLE public.lab_pathology_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_pathology_order_items ENABLE ROW LEVEL SECURITY;

-- View: admin/lab/staff/finance/doctor + patient who owns it
CREATE POLICY "View pathology orders"
ON public.lab_pathology_orders FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY (ARRAY['admin','lab','staff','finance','doctor'])))
  OR patient_id = auth.uid()
);

-- Manage: admin/staff/lab
CREATE POLICY "Manage pathology orders"
ON public.lab_pathology_orders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = ANY (ARRAY['admin','staff','lab'])))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = ANY (ARRAY['admin','staff','lab'])));

CREATE POLICY "View pathology order items"
ON public.lab_pathology_order_items FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage pathology order items"
ON public.lab_pathology_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = ANY (ARRAY['admin','staff','lab'])))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = ANY (ARRAY['admin','staff','lab'])));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_pathology_orders_updated_at ON public.lab_pathology_orders;
CREATE TRIGGER trg_pathology_orders_updated_at
BEFORE UPDATE ON public.lab_pathology_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order number generator
CREATE OR REPLACE FUNCTION public.generate_pathology_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  formatted TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'PATH-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.lab_pathology_orders
  WHERE order_number ~ '^PATH-[0-9]+$';
  formatted := 'PATH-' || LPAD(next_num::TEXT, 6, '0');
  RETURN formatted;
END;
$$;