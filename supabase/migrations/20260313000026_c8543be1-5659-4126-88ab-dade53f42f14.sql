-- Revert: counter appointments should stay 'scheduled' until doctor completes them
UPDATE appointments 
SET status = 'scheduled' 
WHERE booking_type = 'counter' 
  AND payment_status = 'paid' 
  AND status = 'completed'
  AND id = '699de23d-121c-41e7-8e8e-c7f0ee510c9c';