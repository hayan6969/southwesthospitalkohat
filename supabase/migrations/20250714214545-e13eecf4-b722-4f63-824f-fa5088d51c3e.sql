-- Create a function to reorder queue positions after cancellation
CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_cancelled_position INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Move up all queue positions that were behind the cancelled appointment
  UPDATE public.queue_positions 
  SET 
    queue_position = queue_position - 1,
    updated_at = now()
  WHERE 
    doctor_id = p_doctor_id 
    AND appointment_date = p_appointment_date 
    AND queue_position > p_cancelled_position
    AND status IN ('waiting', 'in_progress');
END;
$$;