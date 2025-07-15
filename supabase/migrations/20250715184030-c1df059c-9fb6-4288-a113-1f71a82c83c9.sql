-- Add consultation fee column to appointments table to store historical consultation fee
ALTER TABLE public.appointments 
ADD COLUMN consultation_fee_at_time NUMERIC DEFAULT 0;

-- Create function to update historical appointments with consultation fee
CREATE OR REPLACE FUNCTION public.update_historical_consultation_fees()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    apt_record RECORD;
    doctor_fee NUMERIC;
BEGIN
    -- Update all existing appointments with the doctor's current consultation fee
    FOR apt_record IN 
        SELECT DISTINCT a.doctor_id, a.id
        FROM public.appointments a
        WHERE a.consultation_fee_at_time IS NULL OR a.consultation_fee_at_time = 0
    LOOP
        -- Get the doctor's consultation fee
        SELECT COALESCE(consultation_fee, 0) INTO doctor_fee
        FROM public.doctors
        WHERE id = apt_record.doctor_id;
        
        -- Update the appointment
        UPDATE public.appointments
        SET consultation_fee_at_time = doctor_fee
        WHERE id = apt_record.id;
    END LOOP;
END;
$$;

-- Run the function to update historical appointments
SELECT public.update_historical_consultation_fees();

-- Drop the temporary function as it's no longer needed
DROP FUNCTION public.update_historical_consultation_fees();

-- Update the calculate_doctor_earnings function to use historical consultation fees
CREATE OR REPLACE FUNCTION public.calculate_doctor_earnings(p_doctor_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(appointment_count integer, ot_count integer, consultation_earnings numeric, ot_earnings numeric, total_earnings numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  appointment_cnt INTEGER;
  ot_cnt INTEGER;
  consult_earnings NUMERIC;
  ot_earnings_total NUMERIC;
  total_earn NUMERIC;
BEGIN
  -- Count completed appointments in the period
  SELECT COUNT(*) INTO appointment_cnt
  FROM public.appointments a
  WHERE a.doctor_id = p_doctor_id
    AND a.status = 'completed'
    AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  
  -- Count completed OT operations in the period
  SELECT COUNT(*) INTO ot_cnt
  FROM public.ot_schedules ots
  WHERE ots.doctor_id = p_doctor_id
    AND ots.status = 'completed'
    AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate consultation earnings using historical consultation fees
  SELECT COALESCE(SUM(a.consultation_fee_at_time), 0) INTO consult_earnings
  FROM public.appointments a
  WHERE a.doctor_id = p_doctor_id
    AND a.status = 'completed'
    AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  
  -- Calculate OT earnings
  SELECT COALESCE(SUM(ots.doctor_expense), 0) INTO ot_earnings_total
  FROM public.ot_schedules ots
  WHERE ots.doctor_id = p_doctor_id
    AND ots.status = 'completed'
    AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate total earnings
  total_earn := consult_earnings + ot_earnings_total;
  
  RETURN QUERY SELECT 
    appointment_cnt,
    ot_cnt,
    consult_earnings,
    ot_earnings_total,
    total_earn;
END;
$$;

-- Create trigger function to automatically set consultation fee when appointment is created
CREATE OR REPLACE FUNCTION public.set_appointment_consultation_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    doctor_fee NUMERIC;
BEGIN
    -- Get the doctor's current consultation fee
    SELECT COALESCE(consultation_fee, 0) INTO doctor_fee
    FROM public.doctors
    WHERE id = NEW.doctor_id;
    
    -- Set the consultation fee at time of appointment creation
    NEW.consultation_fee_at_time := doctor_fee;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically set consultation fee on appointment insert
CREATE TRIGGER set_consultation_fee_trigger
    BEFORE INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_consultation_fee();