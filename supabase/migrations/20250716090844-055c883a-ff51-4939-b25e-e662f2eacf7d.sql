-- Remove all pharmacy revenue data
-- First delete invoice items (child records)
DELETE FROM public.pharmacy_invoice_items;

-- Then delete pharmacy invoices (parent records)  
DELETE FROM public.pharmacy_invoices;