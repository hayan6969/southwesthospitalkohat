-- Add payment date to hospital settings
ALTER TABLE public.hospital_settings 
ADD COLUMN payroll_payment_date INTEGER DEFAULT 1 CHECK (payroll_payment_date BETWEEN 1 AND 31);

-- Create payroll templates table (for recurring staff salaries)
CREATE TABLE public.payroll_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  role TEXT NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(employee_id)
);

-- Enable Row Level Security on payroll templates
ALTER TABLE public.payroll_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for payroll templates
CREATE POLICY "Finance users can view all payroll templates" 
ON public.payroll_templates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can create payroll templates" 
ON public.payroll_templates 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can update payroll templates" 
ON public.payroll_templates 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can delete payroll templates" 
ON public.payroll_templates 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

-- Create trigger for automatic timestamp updates on payroll templates
CREATE TRIGGER update_payroll_templates_updated_at
BEFORE UPDATE ON public.payroll_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate monthly payroll cycles
CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(target_month TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_record RECORD;
    inserted_count INTEGER := 0;
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
        END IF;
    END LOOP;
    
    RETURN inserted_count;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_payroll_templates_employee_id ON public.payroll_templates(employee_id);
CREATE INDEX idx_payroll_templates_is_active ON public.payroll_templates(is_active);