-- Delete the duplicate invoice (the later one at 07:43)
-- First delete its items
DELETE FROM pharmacy_invoice_items WHERE invoice_id = 'fbc54cbb-a471-4470-9c8a-690dc7af0947';

-- Then delete the invoice itself
DELETE FROM pharmacy_invoices WHERE id = 'fbc54cbb-a471-4470-9c8a-690dc7af0947';

-- Restore the stock that was double-deducted
UPDATE medicines SET stock_quantity = stock_quantity + 2 WHERE id = '7b17e521-c0f1-4df4-9e5a-cb61989d051e'; -- U PROGEST 200MG
UPDATE medicines SET stock_quantity = stock_quantity + 1 WHERE id = '9959899a-067c-4bff-b5b1-cc8aac9e9dee'; -- INOFOLIC
UPDATE medicines SET stock_quantity = stock_quantity + 1 WHERE id = '9f3705b9-7889-4e83-b353-d3a50654df4c'; -- LEDERPLEX
UPDATE medicines SET stock_quantity = stock_quantity + 3 WHERE id = 'ef6ee241-acc1-4133-abe5-3980b5809e59'; -- GLUCOPHAGE
UPDATE medicines SET stock_quantity = stock_quantity + 1 WHERE id = '5464b35a-afea-4106-9577-72c38ce4beec'; -- ABOCAL