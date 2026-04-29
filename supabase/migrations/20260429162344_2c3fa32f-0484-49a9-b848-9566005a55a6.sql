-- Ensure EMERGENCY placeholder exists in auth.users, profiles, and patients
-- so that emergency consultation invoices can reference a valid patient_id.

DO $$
DECLARE
  placeholder_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- 1) auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = placeholder_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      placeholder_id,
      'authenticated', 'authenticated',
      'emergency@patient.local',
      extensions.crypt('emergency-placeholder', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name','EMERGENCY','last_name','PATIENT','role','patient'),
      now(), now(), '', '', '', ''
    );
  END IF;

  -- 2) profiles
  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (placeholder_id, 'emergency@patient.local', 'EMERGENCY', 'PATIENT', 'patient', '0000000000')
  ON CONFLICT (id) DO NOTHING;

  -- 3) patients
  INSERT INTO public.patients (id, cnic, patient_number)
  VALUES (placeholder_id, '', 'EMERGENCY')
  ON CONFLICT (id) DO NOTHING;
END $$;