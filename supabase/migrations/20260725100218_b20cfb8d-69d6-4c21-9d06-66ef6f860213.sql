
-- 1. Add guardian_id + relation to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relation TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_guardian_id ON public.patients(guardian_id);

-- 2. Function: create a linked family-member patient under an existing guardian phone.
--    Guardian is looked up by phone. A synthetic auth user is created (phone+N@patient.local)
--    so the family member has its own patients row (and thus its own invoices/reports/appointments),
--    but no separate login - they will be reachable via the guardian's login through the
--    patient switcher (Phase 2).
CREATE OR REPLACE FUNCTION public.create_family_member(
  p_guardian_phone TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_relation TEXT,
  p_cnic TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $$
DECLARE
  v_phone TEXT := trim(p_guardian_phone);
  v_guardian_id UUID;
  v_new_user_id UUID;
  v_email TEXT;
  v_suffix INT;
  v_patient_number TEXT;
BEGIN
  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;

  -- Find guardian by phone (the patient who owns the phone number)
  SELECT p.id INTO v_guardian_id
  FROM public.profiles p
  JOIN public.patients pt ON pt.id = p.id
  WHERE p.phone = v_phone
    AND p.role = 'patient'
    AND pt.guardian_id IS NULL  -- guardian must not itself be a family member
  ORDER BY p.created_at
  LIMIT 1;

  IF v_guardian_id IS NULL THEN
    RAISE EXCEPTION 'GUARDIAN_NOT_FOUND';
  END IF;

  -- Generate a unique synthetic email for the family member.
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_suffix
  FROM public.patients WHERE guardian_id = v_guardian_id;
  v_email := v_phone || '+' || v_suffix || '@patient.local';

  WHILE EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) LOOP
    v_suffix := v_suffix + 1;
    v_email := v_phone || '+' || v_suffix || '@patient.local';
  END LOOP;

  v_new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_new_user_id, 'authenticated', 'authenticated',
    v_email,
    extensions.crypt(COALESCE(NULLIF(p_cnic, ''), v_phone), extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', 'patient'),
    now(), now(), '', '', '', ''
  );

  -- Profile: phone stays NULL so the unique_phone_for_patients constraint is not violated
  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (v_new_user_id, v_email, p_first_name, p_last_name, 'patient', NULL)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;

  INSERT INTO public.patients (
    id, cnic, date_of_birth, province, city,
    patient_number, guardian_id, relation
  )
  VALUES (
    v_new_user_id,
    COALESCE(p_cnic, ''),
    p_date_of_birth,
    p_province,
    p_city,
    public.generate_patient_number(),
    v_guardian_id,
    p_relation
  )
  RETURNING patient_number INTO v_patient_number;

  RETURN jsonb_build_object(
    'user_id', v_new_user_id,
    'patient_number', v_patient_number,
    'guardian_id', v_guardian_id,
    'guardian_phone', v_phone,
    'relation', p_relation
  );
END;
$$;

-- 3. Helper: lookup a guardian patient by phone (for the "add family member?" prompt in the UI)
CREATE OR REPLACE FUNCTION public.lookup_guardian_by_phone(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone TEXT := trim(p_phone);
  v_result JSONB;
  v_member_count INT;
BEGIN
  SELECT jsonb_build_object(
    'guardian_id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'patient_number', pt.patient_number,
    'phone', p.phone
  )
  INTO v_result
  FROM public.profiles p
  JOIN public.patients pt ON pt.id = p.id
  WHERE p.phone = v_phone
    AND p.role = 'patient'
    AND pt.guardian_id IS NULL
  ORDER BY p.created_at
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.patients
  WHERE guardian_id = (v_result->>'guardian_id')::uuid;

  RETURN v_result || jsonb_build_object('family_member_count', v_member_count);
END;
$$;
