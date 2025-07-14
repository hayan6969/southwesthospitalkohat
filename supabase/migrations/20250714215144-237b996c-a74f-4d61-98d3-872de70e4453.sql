-- Fix the reorder queue function with a sequential approach to avoid constraint violations
CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_cancelled_position INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  queue_record RECORD;
  new_position INTEGER;
BEGIN
  -- Get all queue positions that need to be moved up (those after the cancelled position)
  -- and process them one by one in order
  new_position := p_cancelled_position;
  
  FOR queue_record IN
    SELECT id, queue_position
    FROM public.queue_positions 
    WHERE 
      doctor_id = p_doctor_id 
      AND appointment_date = p_appointment_date 
      AND queue_position > p_cancelled_position
      AND status IN ('waiting', 'in_progress')
    ORDER BY queue_position ASC
  LOOP
    -- Update each record individually with the next available position
    UPDATE public.queue_positions 
    SET 
      queue_position = new_position,
      updated_at = now()
    WHERE id = queue_record.id;
    
    -- Increment for next record
    new_position := new_position + 1;
  END LOOP;
END;
$$;