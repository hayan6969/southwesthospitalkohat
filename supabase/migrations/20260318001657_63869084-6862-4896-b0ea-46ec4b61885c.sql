
-- Inventory Items (general supplies like markers, pages, etc.)
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock_level INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pieces',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lab Inventory Items (tubes, reagents, etc.)
CREATE TABLE public.lab_inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'consumable',
  description TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock_level INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'pieces',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory Requests (from any dashboard)
CREATE TABLE public.inventory_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  provided_by UUID,
  provided_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expense_amount NUMERIC,
  expense_bill_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

-- Inventory Items policies
CREATE POLICY "Everyone can view inventory items" ON public.inventory_items
  FOR SELECT USING (true);

CREATE POLICY "Inventory manager and admin can manage inventory items" ON public.inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  );

-- Lab Inventory Items policies
CREATE POLICY "Everyone can view lab inventory items" ON public.lab_inventory_items
  FOR SELECT USING (true);

CREATE POLICY "Inventory manager and admin can manage lab inventory items" ON public.lab_inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  );

-- Inventory Requests policies
CREATE POLICY "Users can view their own requests" ON public.inventory_requests
  FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Users can create requests" ON public.inventory_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Inventory manager can view all requests" ON public.inventory_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  );

CREATE POLICY "Inventory manager can update requests" ON public.inventory_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('inventory_manager', 'admin'))
  );

CREATE POLICY "Store can view approved requests" ON public.inventory_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store')
  );

CREATE POLICY "Store can update approved requests" ON public.inventory_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'store')
  );

-- Enable realtime for requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_requests;
