-- Update the auto-cancel function to include debugging
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_count INTEGER;
    current_timestamp TIMESTAMPTZ;
BEGIN
  current_timestamp := now();
  
  -- Log what we're looking for
  RAISE NOTICE 'Auto-cancel check at: %', current_timestamp;
  
  -- Check how many appointments match our criteria
  SELECT COUNT(*) INTO overdue_count
  FROM public.appointments 
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < current_timestamp
    AND status = 'scheduled';
    
  RAISE NOTICE 'Found % overdue appointments to cancel', overdue_count;
  
  -- Log details of appointments we're about to cancel
  FOR rec IN 
    SELECT id, payment_due_time, current_timestamp - payment_due_time AS overdue_by
    FROM public.appointments 
    WHERE 
      payment_status = 'pending' 
      AND booking_type = 'online'
      AND payment_due_time < current_timestamp
      AND status = 'scheduled'
  LOOP
    RAISE NOTICE 'Cancelling appointment % (due: %, overdue by: %)', rec.id, rec.payment_due_time, rec.overdue_by;
  END LOOP;
  
  -- Perform the actual cancellation
  UPDATE public.appointments 
  SET 
    status = 'cancelled',
    updated_at = current_timestamp
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < current_timestamp
    AND status = 'scheduled';
    
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
  RAISE NOTICE 'Successfully cancelled % appointments', overdue_count;
END;
$$;