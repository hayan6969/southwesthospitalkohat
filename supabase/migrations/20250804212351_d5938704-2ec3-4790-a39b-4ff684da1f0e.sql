-- First, let's update the test doctor's consultation fee to a proper amount
UPDATE public.doctors 
SET consultation_fee = 5000 
WHERE id = '54cdd4ee-022e-4214-b19e-1ffe6f3cbd5b';

-- Update the existing appointment to have the correct consultation fee
UPDATE public.appointments 
SET consultation_fee_at_time = 5000 
WHERE id = '822f8eb1-2a94-4d2d-a1e4-70ef8ec16e70';

-- Ensure the trigger is working properly by recreating it
CREATE OR REPLACE FUNCTION public.set_appointment_consultation_fee()
RETURNS trigger
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

-- Make sure the trigger exists and is active
DROP TRIGGER IF EXISTS set_consultation_fee_trigger ON public.appointments;
CREATE TRIGGER set_consultation_fee_trigger
    BEFORE INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_consultation_fee();