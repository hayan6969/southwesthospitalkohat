-- Fix ambiguous column reference in generate_doctor_payments function
CREATE OR REPLACE FUNCTION public.generate_doctor_payments(target_month date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  doctor_record RECORD;
  earnings_data RECORD;
  inserted_count INTEGER := 0;
  period_start_var DATE;
  period_end_var DATE;
BEGIN
  -- Set period dates (start and end of month)
  period_start_var := DATE_TRUNC('month', target_month)::DATE;
  period_end_var := (DATE_TRUNC('month', target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Loop through all active doctors
  FOR doctor_record IN 
    SELECT d.id, p.first_name, p.last_name
    FROM public.doctors d
    JOIN public.profiles p ON d.id = p.id
    WHERE p.is_active = true AND p.role = 'doctor'
  LOOP
    -- Check if payment record already exists for this doctor and period
    IF NOT EXISTS (
      SELECT 1 FROM public.doctor_payments dp
      WHERE dp.doctor_id = doctor_record.id 
        AND dp.period_start = period_start_var 
        AND dp.period_end = period_end_var
    ) THEN
      -- Calculate earnings for this doctor
      SELECT * INTO earnings_data
      FROM public.calculate_doctor_earnings(
        doctor_record.id, 
        period_start_var, 
        period_end_var
      );
      
      -- Only insert if there are earnings
      IF earnings_data.total_earnings > 0 THEN
        INSERT INTO public.doctor_payments (
          doctor_id,
          period_start,
          period_end,
          appointment_count,
          ot_count,
          consultation_earnings,
          ot_earnings,
          total_earnings,
          payment_status
        ) VALUES (
          doctor_record.id,
          period_start_var,
          period_end_var,
          earnings_data.appointment_count,
          earnings_data.ot_count,
          earnings_data.consultation_earnings,
          earnings_data.ot_earnings,
          earnings_data.total_earnings,
          'pending'
        );
        
        inserted_count := inserted_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$function$;