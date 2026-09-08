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