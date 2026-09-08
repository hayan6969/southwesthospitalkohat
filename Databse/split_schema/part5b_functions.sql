CREATE OR REPLACE FUNCTION public.generate_pathology_order_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_patient_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE next_num INTEGER; formatted_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'P-(.*)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.patients WHERE patient_number ~ '^P-[0-9]+$';
  formatted_num := 'P-' || LPAD(next_num::TEXT, 5, '0');
  RETURN formatted_num;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT CASE WHEN role = 'super_admin' THEN 'admin' ELSE role END
  FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_last_daily_closing()
 RETURNS TABLE(id uuid, closing_date date, closing_time timestamp with time zone, day_name text, hospital_revenue numeric, pharmacy_revenue numeric, pharmacy_profit numeric, total_expenses numeric, total_refunds numeric, net_profit numeric, transactions_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN RETURN QUERY SELECT dc.* FROM public.daily_closings dc ORDER BY dc.closing_date DESC LIMIT 1; END; $function$;

CREATE OR REPLACE FUNCTION public.get_next_ot_queue_position(room_uuid uuid, operation_date_param date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.ot_schedules WHERE room_id = room_uuid AND operation_date = operation_date_param;
  RETURN next_position;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_next_queue_position(doctor_uuid uuid, appointment_date_param date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position FROM public.queue_positions WHERE doctor_id = doctor_uuid AND appointment_date = appointment_date_param;
  RETURN next_position;
END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$;

CREATE OR REPLACE FUNCTION public.log_invoice_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
END; $function$;

CREATE OR REPLACE FUNCTION public.lookup_guardian_by_phone(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reorder_queue_after_cancellation(p_doctor_id uuid, p_appointment_date date, p_cancelled_position integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE queue_record RECORD; new_position INTEGER;
BEGIN
  new_position := p_cancelled_position;
  FOR queue_record IN SELECT id, queue_position FROM public.queue_positions WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date AND queue_position > p_cancelled_position AND status IN ('waiting','in_progress') ORDER BY queue_position ASC
  LOOP
    UPDATE public.queue_positions SET queue_position = new_position, updated_at = now() WHERE id = queue_record.id;
    new_position := new_position + 1;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_admission_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.generate_admission_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_appointment_consultation_fee()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE doctor_fee NUMERIC;
BEGIN
  SELECT COALESCE(consultation_fee, 0) INTO doctor_fee FROM public.doctors WHERE id = NEW.doctor_id;
  NEW.consultation_fee_at_time := doctor_fee;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_ipd_invoice_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_ipd_invoice_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_patient_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.id = COALESCE(NEW.id, gen_random_uuid());
  IF NEW.patient_number IS NULL THEN NEW.patient_number = generate_patient_number(); END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_bed_status_on_admission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_lab_report_amount_from_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_pathology_amounts_from_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_queue_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.queue_positions SET status = 'completed', updated_at = now() WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pathology_report(p_report_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_pathology_report_full(p_report_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
