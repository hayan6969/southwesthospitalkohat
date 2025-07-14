-- Update the auto-cancellation function to be smarter about future appointments and first patients
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
  
  -- Only cancel appointments that are:
  -- 1. For today (not future dates)
  -- 2. Not the first appointment of the day for that doctor
  -- 3. Overdue for payment
  SELECT COUNT(*) INTO overdue_count
  FROM public.appointments a
  JOIN public.queue_positions qp ON a.id = qp.appointment_id
  WHERE 
    a.payment_status = 'pending' 
    AND a.booking_type = 'online'
    AND a.payment_due_time < check_time
    AND a.status = 'scheduled'
    AND DATE(a.appointment_date) = DATE(check_time)  -- Only today's appointments
    AND qp.queue_position > 1;  -- Not the first appointment of the day
    
  RAISE NOTICE 'Found % overdue appointments to cancel (excluding future dates and first appointments)', overdue_count;
  
  -- Log details of appointments we're about to cancel
  FOR rec IN 
    SELECT a.id, a.payment_due_time, check_time - a.payment_due_time AS overdue_by, qp.queue_position
    FROM public.appointments a
    JOIN public.queue_positions qp ON a.id = qp.appointment_id
    WHERE 
      a.payment_status = 'pending' 
      AND a.booking_type = 'online'
      AND a.payment_due_time < check_time
      AND a.status = 'scheduled'
      AND DATE(a.appointment_date) = DATE(check_time)
      AND qp.queue_position > 1
  LOOP
    RAISE NOTICE 'Cancelling appointment % (position: %, due: %, overdue by: %)', rec.id, rec.queue_position, rec.payment_due_time, rec.overdue_by;
  END LOOP;
  
  -- Perform the actual cancellation (only for today's non-first appointments)
  UPDATE public.appointments 
  SET 
    status = 'cancelled',
    updated_at = check_time
  FROM public.queue_positions qp
  WHERE 
    appointments.id = qp.appointment_id
    AND appointments.payment_status = 'pending' 
    AND appointments.booking_type = 'online'
    AND appointments.payment_due_time < check_time
    AND appointments.status = 'scheduled'
    AND DATE(appointments.appointment_date) = DATE(check_time)  -- Only today
    AND qp.queue_position > 1;  -- Not first appointment
    
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
  RAISE NOTICE 'Successfully cancelled % appointments', overdue_count;
END;
$$;