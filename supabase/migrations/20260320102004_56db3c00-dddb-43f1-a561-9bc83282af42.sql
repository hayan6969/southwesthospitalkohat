
CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  template_record RECORD;
  inserted_count INTEGER := 0;
  overtime_hours_total NUMERIC := 0;
  overtime_amount_total NUMERIC := 0;
  final_allowances NUMERIC;
  final_net NUMERIC;
BEGIN
  FOR template_record IN
    SELECT * FROM public.payroll_templates WHERE is_active = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
    ) THEN
      -- Sum all overtime hours and amounts for this employee in the target month
      -- Match by employee_id OR by name (case-insensitive)
      SELECT 
        COALESCE(SUM(overtime_hours), 0),
        COALESCE(SUM(overtime_amount), 0)
      INTO overtime_hours_total, overtime_amount_total
      FROM public.overtime_records
      WHERE (
        employee_id = template_record.employee_id
        OR LOWER(TRIM(employee_name)) = LOWER(TRIM(template_record.employee_name))
      )
      AND to_char(overtime_date::date, 'YYYY-MM') = target_month;

      -- Use overtime_amount if already calculated, otherwise just use hours (rate applied at payment)
      final_allowances := COALESCE(template_record.allowances, 0) + overtime_amount_total;
      final_net := template_record.base_salary + final_allowances - COALESCE(template_record.deductions, 0);

      INSERT INTO public.payroll (
        employee_id, employee_name, role, base_salary,
        allowances, deductions, net_salary, pay_period, status
      ) VALUES (
        template_record.employee_id, template_record.employee_name,
        template_record.role, template_record.base_salary,
        final_allowances, template_record.deductions,
        final_net, target_month, 'pending'
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$function$;
