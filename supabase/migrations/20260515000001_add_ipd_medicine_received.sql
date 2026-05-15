-- Add received_at and received_by columns to ipd_medicine_orders
ALTER TABLE public.ipd_medicine_orders
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
