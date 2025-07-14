-- Fix the reorder queue function to avoid unique constraint violations
CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_cancelled_position INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- First, set a temporary high value to avoid constraint violations
  UPDATE public.queue_positions 
  SET 
    queue_position = queue_position + 1000,
    updated_at = now()
  WHERE 
    doctor_id = p_doctor_id 
    AND appointment_date = p_appointment_date 
    AND queue_position > p_cancelled_position
    AND status IN ('waiting', 'in_progress');
    
  -- Then update to the correct values
  UPDATE public.queue_positions 
  SET 
    queue_position = queue_position - 1001,
    updated_at = now()
  WHERE 
    doctor_id = p_doctor_id 
    AND appointment_date = p_appointment_date 
    AND queue_position > 1000
    AND status IN ('waiting', 'in_progress');
END;
$$;