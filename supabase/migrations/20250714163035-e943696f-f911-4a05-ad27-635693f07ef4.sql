-- Update the generate_monthly_payroll function to handle conflicts better
-- and provide more detailed error information

CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    template_record RECORD;
    inserted_count INTEGER := 0;
    existing_count INTEGER := 0;
BEGIN
    -- Loop through all active payroll templates
    FOR template_record IN 
        SELECT * FROM public.payroll_templates 
        WHERE is_active = true
    LOOP
        -- Check if payroll already exists for this employee and month
        IF NOT EXISTS (
            SELECT 1 FROM public.payroll 
            WHERE employee_id = template_record.employee_id 
            AND pay_period = target_month
        ) THEN
            -- Insert new payroll record
            INSERT INTO public.payroll (
                employee_id,
                employee_name,
                role,
                base_salary,
                allowances,
                deductions,
                net_salary,
                status,
                pay_period,
                created_by
            ) VALUES (
                template_record.employee_id,
                template_record.employee_name,
                template_record.role,
                template_record.base_salary,
                template_record.allowances,
                template_record.deductions,
                template_record.net_salary,
                'pending',
                target_month,
                template_record.created_by
            );
            
            inserted_count := inserted_count + 1;
        ELSE
            existing_count := existing_count + 1;
        END IF;
    END LOOP;
    
    -- If no new records were inserted and there were existing records, raise a notice
    IF inserted_count = 0 AND existing_count > 0 THEN
        RAISE EXCEPTION 'Payroll for % already exists for all % employees', target_month, existing_count;
    END IF;
    
    RETURN inserted_count;
END;
$function$;