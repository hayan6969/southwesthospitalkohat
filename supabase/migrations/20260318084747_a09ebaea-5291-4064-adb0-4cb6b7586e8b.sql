
CREATE TABLE public.lab_stock_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  used_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.lab_stock_usage ENABLE ROW LEVEL SECURITY;

-- Lab users can insert their own usage records
CREATE POLICY "Users can record their own usage"
ON public.lab_stock_usage
FOR INSERT
TO authenticated
WITH CHECK (used_by = auth.uid());

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.lab_stock_usage
FOR SELECT
TO authenticated
USING (used_by = auth.uid());

-- Managers and admins can view all usage
CREATE POLICY "Managers can view all usage"
ON public.lab_stock_usage
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('inventory_manager', 'admin', 'store')
));
