-- Fix the handle_new_user trigger to save phone number for patient accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  extracted_phone TEXT;
BEGIN
  -- For patient accounts with email pattern {phone}@patient.local, extract and save the phone
  IF NEW.email LIKE '%@patient.local' THEN
    extracted_phone := REPLACE(NEW.email, '@patient.local', '');
    
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
      extracted_phone
    );
  ELSE
    -- Non-patient accounts
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Backfill existing patient phone numbers from their emails
UPDATE public.profiles
SET phone = REPLACE(email, '@patient.local', '')
WHERE email LIKE '%@patient.local' 
  AND (phone IS NULL OR phone = '');

-- Ensure all existing patients have patient numbers
UPDATE public.patients p
SET patient_number = generate_patient_number()
WHERE patient_number IS NULL
  AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = p.id AND pr.role = 'patient');