-- Fix existing counter appointments that were paid but left as 'scheduled'
UPDATE appointments 
SET status = 'completed' 
WHERE booking_type = 'counter' 
  AND payment_status = 'paid' 
  AND status = 'scheduled';