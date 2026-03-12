-- Fix the cancelled appointment's invoice: mark it as cancelled
UPDATE public.invoices SET status = 'cancelled' WHERE id = '05e2c1af-0eb1-4704-b312-8266e045a4fe';

-- Update both invoices with the correct doctor_id
UPDATE public.invoices SET doctor_id = '7ec1f07f-1283-4889-b4c7-2b131db03c3b' WHERE id IN ('ffd93264-ecd5-4b7f-9e59-3c73739a5df8', '05e2c1af-0eb1-4704-b312-8266e045a4fe');