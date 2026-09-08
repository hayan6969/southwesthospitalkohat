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