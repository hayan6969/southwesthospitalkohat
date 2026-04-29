-- Ensure pgcrypto is available; reference functions with extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_user_account(p_email text, p_password text, p_first_name text, p_last_name text, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, auth
AS $function$
DECLARE new_user_id uuid;
BEGIN
  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), now(), now(), '', '', '', '');
  RETURN new_user_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_patient_account(p_phone text, p_cnic text, p_first_name text, p_last_name text, p_province text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, auth
AS $function$
DECLARE
  v_phone text := trim(p_phone);
  v_email text;
  v_user_id uuid;
  v_patient_number text;
BEGIN
  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  v_email := v_phone || '@patient.local';

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE phone = v_phone OR email = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.patients WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_cnic, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'patient'),
      now(), now(), '', '', '', ''
    );
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (v_user_id, v_email, p_first_name, p_last_name, 'patient', v_phone)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

  INSERT INTO public.patients (id, cnic, province, city, patient_number)
  VALUES (v_user_id, COALESCE(p_cnic, ''), p_province, p_city, public.generate_patient_number())
  ON CONFLICT (id) DO UPDATE SET
    cnic = EXCLUDED.cnic,
    province = EXCLUDED.province,
    city = EXCLUDED.city,
    patient_number = COALESCE(public.patients.patient_number, public.generate_patient_number())
  RETURNING patient_number INTO v_patient_number;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'patient_number', v_patient_number,
    'phone', v_phone
  );
END;
$function$;