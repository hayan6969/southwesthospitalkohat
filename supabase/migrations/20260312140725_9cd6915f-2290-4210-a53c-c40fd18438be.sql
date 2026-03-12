CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  template_record RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR template_record IN
    SELECT * FROM public.payroll_templates WHERE is_active = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
    ) THEN
      INSERT INTO public.payroll (
        employee_id, employee_name, role, base_salary,
        allowances, deductions, net_salary, pay_period, status
      ) VALUES (
        template_record.employee_id, template_record.employee_name,
        template_record.role, template_record.base_salary,
        template_record.allowances, template_record.deductions,
        template_record.net_salary, target_month, 'pending'
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$function$;