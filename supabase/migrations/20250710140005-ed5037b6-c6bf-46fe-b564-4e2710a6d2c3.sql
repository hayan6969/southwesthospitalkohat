-- Update the auto-cancel function to include debugging
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_count INTEGER;
    check_time TIMESTAMPTZ;
    rec RECORD;
BEGIN
  check_time := now();
  
  -- Log what we're looking for
  RAISE NOTICE 'Auto-cancel check at: %', check_time;
  
  -- Check how many appointments match our criteria
  SELECT COUNT(*) INTO overdue_count
  FROM public.appointments 
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < check_time
    AND status = 'scheduled';
    
  RAISE NOTICE 'Found % overdue appointments to cancel', overdue_count;
  
  -- Log details of appointments we're about to cancel
  FOR rec IN 
    SELECT id, payment_due_time, check_time - payment_due_time AS overdue_by
    FROM public.appointments 
    WHERE 
      payment_status = 'pending' 
      AND booking_type = 'online'
      AND payment_due_time < check_time
      AND status = 'scheduled'
  LOOP
    RAISE NOTICE 'Cancelling appointment % (due: %, overdue by: %)', rec.id, rec.payment_due_time, rec.overdue_by;
  END LOOP;
  
  -- Perform the actual cancellation
  UPDATE public.appointments 
  SET 
    status = 'cancelled',
    updated_at = check_time
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < check_time
    AND status = 'scheduled';
    
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
  RAISE NOTICE 'Successfully cancelled % appointments', overdue_count;
END;
$$;