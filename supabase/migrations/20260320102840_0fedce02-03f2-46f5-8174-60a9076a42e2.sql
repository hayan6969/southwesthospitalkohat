
CREATE TABLE IF NOT EXISTS public.finance_settings (
  id integer PRIMARY KEY DEFAULT 1,
  overtime_hourly_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance and admin can view finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can view finance settings"
ON public.finance_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text])
  )
);

DROP POLICY IF EXISTS "Finance and admin can update finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can update finance settings"
ON public.finance_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text])
  )
);

DROP POLICY IF EXISTS "Finance and admin can insert finance settings" ON public.finance_settings;
CREATE POLICY "Finance and admin can insert finance settings"
ON public.finance_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['finance'::text, 'admin'::text])
  )
);

DROP TRIGGER IF EXISTS update_finance_settings_updated_at ON public.finance_settings;
CREATE TRIGGER update_finance_settings_updated_at
BEFORE UPDATE ON public.finance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.finance_settings (id, overtime_hourly_rate)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  template_record RECORD;
  inserted_count INTEGER := 0;
  overtime_total NUMERIC := 0;
  default_overtime_rate NUMERIC := 0;
  final_allowances NUMERIC;
  final_net NUMERIC;
BEGIN
  SELECT COALESCE(overtime_hourly_rate, 0)
  INTO default_overtime_rate
  FROM public.finance_settings
  WHERE id = 1;

  FOR template_record IN
    SELECT * FROM public.payroll_templates WHERE is_active = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.payroll
      WHERE employee_id = template_record.employee_id
        AND pay_period = target_month
    ) THEN
      SELECT COALESCE(
        SUM(
          CASE
            WHEN COALESCE(overtime_amount, 0) > 0 THEN COALESCE(overtime_amount, 0)
            ELSE COALESCE(overtime_hours, 0) * COALESCE(NULLIF(overtime_rate, 0), default_overtime_rate, 0)
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

      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$function$;
