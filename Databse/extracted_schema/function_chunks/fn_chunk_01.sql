CREATE FUNCTION public.auto_assign_queue_position() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE next_pos INTEGER; appointment_date_only DATE;
BEGIN
  appointment_date_only := NEW.appointment_date::DATE;
  next_pos := get_next_queue_position(NEW.doctor_id, appointment_date_only);
  INSERT INTO public.queue_positions (appointment_id, doctor_id, appointment_date, queue_position) VALUES (NEW.id, NEW.doctor_id, appointment_date_only, next_pos);
  RETURN NEW;
END; $$;

CREATE FUNCTION public.auto_cancel_overdue_appointments() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE overdue_count INTEGER; check_time TIMESTAMPTZ; rec RECORD;
BEGIN
  check_time := now();
  UPDATE public.appointments SET status = 'cancelled', updated_at = check_time FROM public.queue_positions qp WHERE appointments.id = qp.appointment_id AND appointments.payment_status = 'pending' AND appointments.booking_type = 'online' AND appointments.payment_due_time < check_time AND appointments.status = 'scheduled' AND DATE(appointments.appointment_date) = DATE(check_time) AND qp.queue_position > 1;
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
END; $$;

CREATE FUNCTION public.auto_set_xray_paid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (NEW.description ILIKE '%xray%' OR NEW.description ILIKE '%x-ray%' OR NEW.description ILIKE '%radiology%' OR NEW.invoice_number LIKE 'XRAY-%') THEN
    NEW.status = 'paid'; NEW.paid_at = now();
  END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION public.auto_set_xray_reports_paid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.status = 'paid'; RETURN NEW; END; $$;

CREATE FUNCTION public.calculate_doctor_earnings(p_doctor_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(appointment_count integer, ot_count integer, consultation_earnings numeric, ot_earnings numeric, total_earnings numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE appointment_cnt INTEGER; ot_cnt INTEGER; consult_earnings NUMERIC; ot_earnings_total NUMERIC; total_earn NUMERIC;
BEGIN
  SELECT COUNT(*) INTO appointment_cnt FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.payment_status = 'paid' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COUNT(*) INTO ot_cnt FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(a.consultation_fee_at_time), 0) INTO consult_earnings FROM public.appointments a WHERE a.doctor_id = p_doctor_id AND a.status = 'completed' AND a.payment_status = 'paid' AND a.cleared_at IS NULL AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(ots.doctor_expense), 0) INTO ot_earnings_total FROM public.ot_schedules ots WHERE ots.doctor_id = p_doctor_id AND ots.status = 'completed' AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  total_earn := consult_earnings + ot_earnings_total;
  RETURN QUERY SELECT appointment_cnt, ot_cnt, consult_earnings, ot_earnings_total, total_earn;
END; $$;

CREATE FUNCTION public.consume_lab_test_stock(p_item_id uuid, p_tests integer, p_test_type_id uuid DEFAULT NULL::uuid, p_report_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_remaining INTEGER := p_tests;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_tests IS NULL OR p_tests <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, tests_remaining
    FROM public.lab_stock_batches
    WHERE item_id = p_item_id
      AND is_active
      AND tests_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.tests_remaining, v_remaining);
    UPDATE public.lab_stock_batches
      SET tests_remaining = tests_remaining - v_take
      WHERE id = b.id;
    INSERT INTO public.lab_stock_consumption
      (batch_id, item_id, test_type_id, report_id, tests_consumed, consumed_by)
      VALUES (b.id, p_item_id, p_test_type_id, p_report_id, v_take, auth.uid());
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_tests - v_remaining;
END;
$$;

CREATE FUNCTION public.create_daily_closing(p_closing_date date, p_closing_time timestamp with time zone, p_day_name text, p_hospital_revenue numeric, p_pharmacy_revenue numeric, p_pharmacy_profit numeric, p_total_expenses numeric, p_total_refunds numeric, p_net_profit numeric, p_transactions_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE closing_id UUID;
BEGIN
  INSERT INTO public.daily_closings (closing_date, closing_time, day_name, hospital_revenue, pharmacy_revenue, pharmacy_profit, total_expenses, total_refunds, net_profit, transactions_data) VALUES (p_closing_date, p_closing_time, p_day_name, p_hospital_revenue, p_pharmacy_revenue, p_pharmacy_profit, p_total_expenses, p_total_refunds, p_net_profit, p_transactions_data) RETURNING id INTO closing_id;
  RETURN closing_id;
END; $$;

CREATE FUNCTION public.create_family_member(p_guardian_phone text, p_first_name text, p_last_name text, p_relation text, p_cnic text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_province text DEFAULT NULL::text, p_city text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION public.create_patient_account(p_phone text, p_cnic text, p_first_name text, p_last_name text, p_province text DEFAULT NULL::text, p_city text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'auth'
    AS $$
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
$$;

CREATE FUNCTION public.create_user_account(p_email text, p_password text, p_first_name text, p_last_name text, p_role text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'auth'
    AS $$
DECLARE
  new_user_id uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS';
  END IF;

  new_user_id := gen_random_uuid();
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'role', p_role), now(), now(), '', '', '', '');
  RETURN new_user_id;
END; $$;