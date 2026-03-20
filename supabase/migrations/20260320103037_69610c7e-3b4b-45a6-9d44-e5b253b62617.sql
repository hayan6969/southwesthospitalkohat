
CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;
