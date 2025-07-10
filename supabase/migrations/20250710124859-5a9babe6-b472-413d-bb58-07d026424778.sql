-- Fix permissions for auto_cancel_overdue_appointments function
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This will run with the function creator's privileges
AS $function$
BEGIN
  UPDATE public.appointments 
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    payment_status = 'pending' 
    AND booking_type = 'online'
    AND payment_due_time < now()
    AND status = 'scheduled';
END;
$function$;