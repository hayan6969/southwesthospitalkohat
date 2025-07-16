-- Update the function to refresh pending payments and fix any date issues
CREATE OR REPLACE FUNCTION public.generate_daily_doctor_payments(target_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  doctor_record RECORD;
  earnings_data RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all active doctors
  FOR doctor_record IN 
    SELECT d.id, p.first_name, p.last_name
    FROM public.doctors d
    JOIN public.profiles p ON d.id = p.id
    WHERE p.is_active = true AND p.role = 'doctor'
  LOOP
    -- Calculate earnings for this doctor for the specific date
    SELECT * INTO earnings_data
    FROM public.calculate_doctor_earnings(
      doctor_record.id, 
      target_date, 
      target_date
    );
    
    -- Only process if there are earnings
    IF earnings_data.total_earnings > 0 THEN
      -- Check if payment record already exists for this doctor and date
      IF EXISTS (
        SELECT 1 FROM public.doctor_payments dp
        WHERE dp.doctor_id = doctor_record.id 
          AND dp.period_start = target_date 
          AND dp.period_end = target_date
      ) THEN
        -- Update existing pending payment with new earnings data
        UPDATE public.doctor_payments 
        SET 
          appointment_count = earnings_data.appointment_count,
          ot_count = earnings_data.ot_count,
          consultation_earnings = earnings_data.consultation_earnings,
          ot_earnings = earnings_data.ot_earnings,
          total_earnings = earnings_data.total_earnings,
          updated_at = now()
        WHERE doctor_id = doctor_record.id 
          AND period_start = target_date 
          AND period_end = target_date
          AND payment_status = 'pending';
        
        IF FOUND THEN
          updated_count := updated_count + 1;
        END IF;
      ELSE
        -- Insert new payment record
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
          target_date,
          target_date,
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
  
  -- Return total count of changes (new + updated)
  RETURN inserted_count + updated_count;
END;
$$;