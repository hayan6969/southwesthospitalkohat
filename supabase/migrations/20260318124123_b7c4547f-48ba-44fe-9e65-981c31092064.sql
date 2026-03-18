
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS manufacturing_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date;

ALTER TABLE public.lab_inventory_items 
  ADD COLUMN IF NOT EXISTS manufacturing_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date;
