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

CREATE FUNCTION public.delete_user_safely(user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Never delete the EMERGENCY placeholder patient. Deleting it would remove every
  -- emergency consultation invoice (DELETE FROM public.invoices below) and break
  -- future emergency invoice creation.
  IF user_uuid = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Cannot delete the EMERGENCY placeholder patient';
  END IF;

  -- Delete records where the user is in a required ownership/processor field
  DELETE FROM public.refunds WHERE processed_by = user_uuid;
  DELETE FROM public.staff_shift_closings WHERE staff_id = user_uuid;

  -- Clear optional references that should not block deletion while preserving records
  UPDATE public.expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.miscellaneous_income SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.emergency_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.hospital_closing_balance SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.invoices SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.doctor_payments SET paid_by = NULL WHERE paid_by = user_uuid;
  UPDATE public.inventory_requests SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.inventory_requests SET provided_by = NULL WHERE provided_by = user_uuid;
  UPDATE public.overtime_records SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_discounts SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_documents SET uploaded_by = NULL WHERE uploaded_by = user_uuid;
  UPDATE public.payroll SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.payroll_templates SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_account SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.refunds SET doctor_id = NULL WHERE doctor_id = user_uuid;
  UPDATE public.staff_shift_closings SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.xray_reports SET doctor_id = NULL WHERE doctor_id = user_uuid;

  -- Delete dependent records before deleting appointments/OT schedules/profiles
  DELETE FROM public.queue_positions WHERE appointment_id IN (
    SELECT id FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );
  DELETE FROM public.postop_progress_entries WHERE ot_schedule_id IN (
    SELECT id FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );

  -- Delete user-owned rows from related tables
  DELETE FROM public.audit_logs WHERE user_id = user_uuid;
  DELETE FROM public.lab_reports WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.lab_stock_usage WHERE used_by = user_uuid;
  DELETE FROM public.medical_records WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.invoices WHERE patient_id = user_uuid;
  DELETE FROM public.patient_documents WHERE patient_id = user_uuid;
  DELETE FROM public.xray_reports WHERE patient_id = user_uuid;
  DELETE FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.doctor_availability WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_daily_status WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_payments WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_working_hours WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_specific_schedules WHERE doctor_id = user_uuid;
  DELETE FROM public.queue_positions WHERE doctor_id = user_uuid;
  DELETE FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.payroll WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.payroll_templates WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.overtime_records WHERE employee_id = user_uuid;
  DELETE FROM public.inventory_requests WHERE requested_by = user_uuid;
  DELETE FROM public.patient_discounts WHERE patient_id = user_uuid;
  DELETE FROM public.patients WHERE id = user_uuid;
  DELETE FROM public.doctors WHERE id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  DELETE FROM auth.users WHERE id = user_uuid;

  RETURN true;
END;
$$;

CREATE FUNCTION public.dispatch_lab_store_to_lab(p_item_id uuid, p_units integer, p_request_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_remaining INTEGER := p_units;
  v_take INTEGER;
  b RECORD;
BEGIN
  IF p_item_id IS NULL OR p_units IS NULL OR p_units <= 0 THEN
    RETURN 0;
  END IF;

  FOR b IN
    SELECT id, units_remaining
    FROM public.lab_store_batches
    WHERE item_id = p_item_id
      AND is_active
      AND units_remaining > 0
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY expiry_date NULLS LAST, created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(b.units_remaining, v_remaining);
    UPDATE public.lab_store_batches
      SET units_remaining = units_remaining - v_take
      WHERE id = b.id;
    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN p_units - v_remaining;
END;
$$;

CREATE FUNCTION public.generate_admission_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(admission_number FROM 'IPD-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_admissions
  WHERE admission_number ~ '^IPD-[0-9]+$';
  RETURN 'IPD-' || LPAD(next_num::TEXT, 6, '0');
END;
$_$;

CREATE FUNCTION public.generate_daily_doctor_payments(target_date date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  records_count INTEGER;
BEGIN
  WITH doctor_consultations AS (
    SELECT 
      i.doctor_id,
      COUNT(DISTINCT i.id) AS appointment_count,
      COALESCE(SUM(i.amount), 0) AS consultation_earnings
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND i.invoice_number LIKE 'INV-%'
      AND i.created_at::date = target_date
      AND (i.description IS NULL OR LOWER(i.description) NOT LIKE '%emergency%')
      AND i.emergency_patient_data IS NULL
      AND i.doctor_id IS NOT NULL
    GROUP BY i.doctor_id
  ),
  doctor_ot AS (
    SELECT
      o.doctor_id,
      COUNT(DISTINCT o.id) AS ot_count,
      COALESCE(SUM(o.doctor_expense), 0) AS ot_earnings,
      COALESCE(SUM(COALESCE(o.total_cost, 0) - COALESCE(o.doctor_expense, 0)), 0) AS hospital_share
    FROM public.ot_schedules o
    WHERE o.status IN ('completed', 'pending')
      AND o.created_at::date = target_date
      AND o.doctor_id IS NOT NULL
    GROUP BY o.doctor_id
  ),
  ipd_earnings AS (
    SELECT
      a.doctor_id,
      COUNT(DISTINCT inv.admission_id) AS ipd_count,
      COALESCE(SUM(inv.doctor_charges_total), 0) AS ipd_doctor_fees,
      COALESCE(SUM(inv.anesthesia_charges_total), 0) AS ipd_anesthesia_fees
    FROM public.ipd_invoices inv
    JOIN public.ipd_admissions a ON a.id = inv.admission_id
    WHERE inv.finalized_at::date = target_date
      AND a.doctor_id IS NOT NULL
    GROUP BY a.doctor_id
  ),
  combined AS (
    SELECT 
      COALESCE(dc.doctor_id, dot.doctor_id, ie.doctor_id) AS doctor_id,
      COALESCE(dc.appointment_count, 0) AS appointment_count,
      COALESCE(dot.ot_count, 0) AS ot_count,
      COALESCE(dc.consultation_earnings, 0) AS consultation_earnings,
      COALESCE(dot.ot_earnings, 0) AS ot_earnings,
      COALESCE(dot.hospital_share, 0) AS hospital_share,
      COALESCE(ie.ipd_count, 0) AS ipd_count,
      COALESCE(ie.ipd_doctor_fees, 0) AS ipd_doctor_fees,
      COALESCE(ie.ipd_anesthesia_fees, 0) AS ipd_anesthesia_fees
    FROM doctor_consultations dc
    FULL OUTER JOIN doctor_ot dot ON dc.doctor_id = dot.doctor_id
    FULL OUTER JOIN ipd_earnings ie ON COALESCE(dc.doctor_id, dot.doctor_id) = ie.doctor_id
  )
  INSERT INTO public.doctor_payments (
    doctor_id, period_start, period_end,
    appointment_count, ot_count,
    consultation_earnings, ot_earnings, total_earnings,
    hospital_share, doctor_share, hospital_share_percentage, payment_status
  )
  SELECT
    c.doctor_id, target_date, target_date,
    c.appointment_count + c.ipd_count,
    c.ot_count,
    c.consultation_earnings + c.ipd_doctor_fees,
    c.ot_earnings + c.ipd_anesthesia_fees,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    c.hospital_share,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    40,
    'pending'
  FROM combined c
  WHERE c.doctor_id IS NOT NULL
  ON CONFLICT (doctor_id, period_start, period_end)
  DO UPDATE SET
    appointment_count = EXCLUDED.appointment_count,
    ot_count = EXCLUDED.ot_count,
    consultation_earnings = EXCLUDED.consultation_earnings,
    ot_earnings = EXCLUDED.ot_earnings,
    total_earnings = EXCLUDED.total_earnings,
    hospital_share = EXCLUDED.hospital_share,
    doctor_share = EXCLUDED.doctor_share,
    payment_status = 'pending',
    updated_at = NOW();

  GET DIAGNOSTICS records_count = ROW_COUNT;
  RETURN records_count;
END;
$$;

CREATE FUNCTION public.generate_ipd_invoice_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'IPDI-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.ipd_invoices
  WHERE invoice_number ~ '^IPDI-[0-9]+$';
  RETURN 'IPDI-' || LPAD(next_num::TEXT, 6, '0');
END;
$_$;

CREATE FUNCTION public.generate_monthly_payroll(target_month text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  template_record RECORD;
  processed_count INTEGER := 0;
  overtime_total NUMERIC := 0;
  default_overtime_rate NUMERIC := 0;
  fallback_overtime_rate NUMERIC := 0;
  effective_overtime_rate NUMERIC := 0;
  final_allowances NUMERIC;
  final_net NUMERIC;
BEGIN
  SELECT COALESCE(overtime_hourly_rate, 0)
  INTO default_overtime_rate
  FROM public.finance_settings
  WHERE id = 1;

  SELECT COALESCE(overtime_rate, 0)
  INTO fallback_overtime_rate
  FROM public.overtime_records
  WHERE overtime_rate > 0
  ORDER BY created_at DESC
  LIMIT 1;

  effective_overtime_rate := COALESCE(NULLIF(default_overtime_rate, 0), NULLIF(fallback_overtime_rate, 0), 0);

  FOR template_record IN
    SELECT * FROM public.payroll_templates WHERE is_active = true
  LOOP
    SELECT COALESCE(
      SUM(
        CASE
          WHEN COALESCE(overtime_amount, 0) > 0 THEN COALESCE(overtime_amount, 0)
          ELSE COALESCE(overtime_hours, 0) * COALESCE(NULLIF(overtime_rate, 0), effective_overtime_rate, 0)
        END
      ),
      0
    )
    INTO overtime_total
    FROM public.overtime_records
    WHERE (
      employee_id::text = template_record.employee_id::text
      OR LOWER(TRIM(employee_name)) = LOWER(TRIM(template_record.employee_name))
    )
    AND to_char(overtime_date::date, 'YYYY-MM') = target_month;

    final_allowances := COALESCE(template_record.allowances, 0) + overtime_total;
    final_net := COALESCE(template_record.base_salary, 0) + final_allowances - COALESCE(template_record.deductions, 0);

    IF EXISTS (
      SELECT 1
      FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
        AND status = 'pending'
    ) THEN
      UPDATE public.payroll
      SET
        employee_name = template_record.employee_name,
        role = template_record.role,
        base_salary = template_record.base_salary,
        allowances = final_allowances,
        deductions = template_record.deductions,
        net_salary = final_net,
        updated_at = now()
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
        AND status = 'pending';

      processed_count := processed_count + 1;
    ELSIF NOT EXISTS (
      SELECT 1
      FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
    ) THEN
      INSERT INTO public.payroll (
        employee_id,
        employee_name,
        role,
        base_salary,
        allowances,
        deductions,
        net_salary,
        pay_period,
        status
      ) VALUES (
        template_record.employee_id,
        template_record.employee_name,
        template_record.role,
        template_record.base_salary,
        final_allowances,
        template_record.deductions,
        final_net,
        target_month,
        'pending'
      );

      processed_count := processed_count + 1;
    END IF;
  END LOOP;

  RETURN processed_count;
END;
$$;

CREATE FUNCTION public.generate_pathology_order_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_num INTEGER;
  formatted TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'PATH-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.lab_pathology_orders
  WHERE order_number ~ '^PATH-[0-9]+$';
  formatted := 'PATH-' || LPAD(next_num::TEXT, 6, '0');
  RETURN formatted;
END;
$_$;

CREATE FUNCTION public.generate_patient_number() RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE next_num INTEGER; formatted_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.patients WHERE patient_number ~ '^P-[0-9]+$';
  formatted_num := 'P-' || LPAD(next_num::TEXT, 5, '0');
  RETURN formatted_num;
END; $_$;

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT CASE WHEN role = 'super_admin' THEN 'admin' ELSE role END
  FROM public.profiles WHERE id = auth.uid();
$$;

CREATE FUNCTION public.get_last_daily_closing() RETURNS TABLE(id uuid, closing_date date, closing_time timestamp with time zone, day_name text, hospital_revenue numeric, pharmacy_revenue numeric, pharmacy_profit numeric, total_expenses numeric, total_refunds numeric, net_profit numeric, transactions_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN RETURN QUERY SELECT dc.* FROM public.daily_closings dc ORDER BY dc.closing_date DESC LIMIT 1; END; $$;

CREATE FUNCTION public.get_next_ot_queue_position(room_uuid uuid, operation_date_param date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.ot_schedules WHERE room_id = room_uuid AND operation_date = operation_date_param;
  RETURN next_position;
END; $$;

CREATE FUNCTION public.get_next_queue_position(doctor_uuid uuid, appointment_date_param date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.queue_positions WHERE doctor_id = doctor_uuid AND appointment_date = appointment_date_param;
  RETURN next_position;
END; $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE extracted_phone TEXT;
BEGIN
  IF NEW.email LIKE '%@patient.local' THEN
    extracted_phone := REPLACE(NEW.email, '@patient.local', '');
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'patient'), extracted_phone);
  ELSE
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'patient'), NEW.raw_user_meta_data->>'phone');
  END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION public.log_invoice_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  changed text[]     := ARRAY[]::text[];
  op      text       := 'updated';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      changed := array_append(changed, 'amount');
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      changed := array_append(changed, 'status');
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      changed := array_append(changed, 'description');
    END IF;
    IF array_length(changed, 1) IS NULL THEN RETURN NEW; END IF;

    -- Priority 1: cancellation (status → cancelled)
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      op := 'cancelled';
    -- Priority 2: genuine discount (amount ↓ + "[Adjusted:" marker)
    ELSIF (NEW.amount IS NOT NULL AND OLD.amount IS NOT NULL
        AND NEW.amount < OLD.amount
        AND NEW.description LIKE '%[Adjusted:%') THEN
      op := 'discounted';
    END IF;

    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields)
      VALUES (NEW.id, NEW.invoice_number, op, auth.uid(),
        OLD.amount, NEW.amount, OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW), changed);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        new_amount, new_status, new_row)
      VALUES (NEW.id, NEW.invoice_number, 'created', auth.uid(), NEW.amount, NEW.status, to_jsonb(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, old_status, old_row)
      VALUES (OLD.id, OLD.invoice_number, 'deleted', auth.uid(), OLD.amount, OLD.status, to_jsonb(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', OLD.id, SQLERRM;
    END;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE FUNCTION public.lookup_guardian_by_phone(p_phone text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
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

CREATE FUNCTION public.reorder_queue_after_cancellation(p_doctor_id uuid, p_appointment_date date, p_cancelled_position integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE queue_record RECORD; new_position INTEGER;
BEGIN
  new_position := p_cancelled_position;
  FOR queue_record IN SELECT id, queue_position FROM public.queue_positions WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date AND queue_position > p_cancelled_position AND status IN ('waiting','in_progress') ORDER BY queue_position ASC
  LOOP
    UPDATE public.queue_positions SET queue_position = new_position, updated_at = now() WHERE id = queue_record.id;
    new_position := new_position + 1;
  END LOOP;
END; $$;

CREATE FUNCTION public.set_admission_defaults() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.generate_admission_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_appointment_consultation_fee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE doctor_fee NUMERIC;
BEGIN
  SELECT COALESCE(consultation_fee, 0) INTO doctor_fee FROM public.doctors WHERE id = NEW.doctor_id;
  NEW.consultation_fee_at_time := doctor_fee;
  RETURN NEW;
END; $$;

CREATE FUNCTION public.set_ipd_invoice_defaults() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_ipd_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_patient_defaults() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.id = COALESCE(NEW.id, gen_random_uuid());
  IF NEW.patient_number IS NULL THEN NEW.patient_number = generate_patient_number(); END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION public.sync_bed_status_on_admission() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- On INSERT/UPDATE, if admitted with a bed -> mark bed occupied
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.status = 'admitted' AND NEW.bed_id IS NOT NULL THEN
      UPDATE public.beds SET status = 'occupied', updated_at = now() WHERE id = NEW.bed_id;
    END IF;
    -- If discharged/cancelled, free the previously held bed
    IF NEW.status IN ('discharged','cancelled') AND NEW.bed_id IS NOT NULL THEN
      UPDATE public.beds SET status = 'available', updated_at = now() WHERE id = NEW.bed_id;
    END IF;
    -- If bed changed, free the old one
    IF TG_OP = 'UPDATE' AND OLD.bed_id IS NOT NULL AND OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
      UPDATE public.beds SET status = 'available', updated_at = now() WHERE id = OLD.bed_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.sync_lab_report_amount_from_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    UPDATE public.lab_pathology_reports
       SET amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND amount IS DISTINCT FROM NEW.amount;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.sync_pathology_amounts_from_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    UPDATE public.lab_pathology_orders
       SET total_amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND total_amount IS DISTINCT FROM NEW.amount;

    UPDATE public.lab_pathology_reports
       SET amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND amount IS DISTINCT FROM NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.sync_patient_name_snapshots() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (COALESCE(NEW.first_name,'') IS DISTINCT FROM COALESCE(OLD.first_name,''))
     OR (COALESCE(NEW.last_name,'') IS DISTINCT FROM COALESCE(OLD.last_name,'')) THEN
    UPDATE public.lab_pathology_reports
       SET patient_name_snapshot = btrim(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,''))
     WHERE patient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_queue_on_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.queue_positions SET status = 'completed', updated_at = now() WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.verify_pathology_report(p_report_number text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'report_number', r.report_number,
    'status', r.status,
    'reported_at', r.reported_at,
    'created_at', r.created_at,
    'patient_number', pt.patient_number,
    'first_name', pr.first_name,
    'last_name', pr.last_name
  )
  INTO result
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;
  RETURN result;
END;
$$;

CREATE FUNCTION public.verify_pathology_report_full(p_report_number text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_report RECORD;
  v_result jsonb;
  v_test_types jsonb;
BEGIN
  SELECT r.*, pt.patient_number, pr.first_name, pr.last_name, pr.phone
  INTO v_report
  FROM public.lab_pathology_reports r
  LEFT JOIN public.patients pt ON pt.id = r.patient_id
  LEFT JOIN public.profiles pr ON pr.id = r.patient_id
  WHERE r.report_number = p_report_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(tt_data ORDER BY sort_order), '[]'::jsonb)
  INTO v_test_types
  FROM (
    SELECT
      rtt.sort_order,
      jsonb_build_object(
        'name', tt.name,
        'report_category', tt.report_category,
        'method', tt.method,
        'notes', tt.notes,
        'parameters', (
          SELECT COALESCE(jsonb_agg(p_data ORDER BY p_sort), '[]'::jsonb)
          FROM (
            SELECT
              p.sort_order AS p_sort,
              jsonb_build_object(
                'parameter_name', p.parameter_name,
                'category_heading', p.category_heading,
                'unit', p.unit,
                'ref_display', p.ref_display,
                'ref_min', p.ref_min,
                'ref_max', p.ref_max,
                'display_all_subranges', p.display_all_subranges,
                'result_value', res.result_value,
                'flag', res.flag,
                'subrange_used', res.subrange_used,
                'subrange_id', res.subrange_id,
                'subranges', (
                  SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', sr.id,
                    'label', sr.label,
                    'ref_min', sr.ref_min,
                    'ref_max', sr.ref_max,
                    'ref_display', sr.ref_display
                  ) ORDER BY sr.sort_order), '[]'::jsonb)
                  FROM public.lab_parameter_subranges sr
                  WHERE sr.parameter_id = p.id
                )
              ) AS p_data
            FROM public.lab_test_parameters p
            LEFT JOIN public.lab_pathology_report_results res
              ON res.parameter_id = p.id AND res.report_id = v_report.id
            WHERE p.test_type_id = tt.id
          ) sub_p
        )
      ) AS tt_data
    FROM public.lab_pathology_report_test_types rtt
    JOIN public.lab_test_types tt ON tt.id = rtt.test_type_id
    WHERE rtt.report_id = v_report.id
  ) sub_tt;

  v_result := jsonb_build_object(
    'report_number', v_report.report_number,
    'status', v_report.status,
    'reported_at', v_report.reported_at,
    'collected_at', v_report.collected_at,
    'registered_at', v_report.registered_at,
    'created_at', v_report.created_at,
    'sample_type', v_report.sample_type,
    'instrument', v_report.instrument,
    'referred_by', v_report.referred_by,
    'collection_address', v_report.collection_address,
    'interpretation', v_report.interpretation,
    'patient_name', COALESCE(v_report.patient_name_snapshot, concat_ws(' ', v_report.first_name, v_report.last_name)),
    'patient_age', v_report.patient_age_snapshot,
    'patient_sex', v_report.patient_sex_snapshot,
    'patient_number', v_report.patient_number,
    'phone', v_report.phone,
    'test_types', v_test_types
  );

  RETURN v_result;
END;
$$;
