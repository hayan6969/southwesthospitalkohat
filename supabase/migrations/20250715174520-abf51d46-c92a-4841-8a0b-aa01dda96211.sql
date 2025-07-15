-- Create doctor_payments table to track payments to doctors
CREATE TABLE public.doctor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  appointment_count INTEGER NOT NULL DEFAULT 0,
  ot_count INTEGER NOT NULL DEFAULT 0,
  consultation_earnings NUMERIC NOT NULL DEFAULT 0,
  ot_earnings NUMERIC NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'processing')),
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  paid_by UUID NULL REFERENCES public.profiles(id),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, period_start, period_end)
);

-- Enable RLS on doctor_payments
ALTER TABLE public.doctor_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor_payments
CREATE POLICY "Finance users can view all doctor payments" 
ON public.doctor_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can create doctor payments" 
ON public.doctor_payments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can update doctor payments" 
ON public.doctor_payments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Doctors can view their own payments" 
ON public.doctor_payments 
FOR SELECT 
USING (doctor_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_doctor_payments_updated_at
BEFORE UPDATE ON public.doctor_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate doctor earnings for a period
CREATE OR REPLACE FUNCTION public.calculate_doctor_earnings(
  p_doctor_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  appointment_count INTEGER,
  ot_count INTEGER,
  consultation_earnings NUMERIC,
  ot_earnings NUMERIC,
  total_earnings NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  consultation_fee NUMERIC;
  appointment_cnt INTEGER;
  ot_cnt INTEGER;
  consult_earnings NUMERIC;
  ot_earnings_total NUMERIC;
  total_earn NUMERIC;
BEGIN
  -- Get doctor's consultation fee
  SELECT COALESCE(d.consultation_fee, 0) INTO consultation_fee
  FROM public.doctors d
  WHERE d.id = p_doctor_id;
  
  -- Count completed appointments in the period
  SELECT COUNT(*) INTO appointment_cnt
  FROM public.appointments a
  WHERE a.doctor_id = p_doctor_id
    AND a.status = 'completed'
    AND DATE(a.appointment_date) BETWEEN p_start_date AND p_end_date;
  
  -- Count completed OT operations in the period
  SELECT COUNT(*) INTO ot_cnt
  FROM public.ot_schedules ots
  WHERE ots.doctor_id = p_doctor_id
    AND ots.status = 'completed'
    AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate consultation earnings
  consult_earnings := appointment_cnt * consultation_fee;
  
  -- Calculate OT earnings
  SELECT COALESCE(SUM(ots.doctor_expense), 0) INTO ot_earnings_total
  FROM public.ot_schedules ots
  WHERE ots.doctor_id = p_doctor_id
    AND ots.status = 'completed'
    AND ots.operation_date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate total earnings
  total_earn := consult_earnings + ot_earnings_total;
  
  RETURN QUERY SELECT 
    appointment_cnt,
    ot_cnt,
    consult_earnings,
    ot_earnings_total,
    total_earn;
END;
$$;

-- Create function to generate monthly doctor payments
CREATE OR REPLACE FUNCTION public.generate_doctor_payments(
  target_month DATE
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  doctor_record RECORD;
  earnings_data RECORD;
  inserted_count INTEGER := 0;
  period_start DATE;
  period_end DATE;
BEGIN
  -- Set period dates (start and end of month)
  period_start := DATE_TRUNC('month', target_month)::DATE;
  period_end := (DATE_TRUNC('month', target_month) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Loop through all active doctors
  FOR doctor_record IN 
    SELECT d.id, p.first_name, p.last_name
    FROM public.doctors d
    JOIN public.profiles p ON d.id = p.id
    WHERE p.is_active = true AND p.role = 'doctor'
  LOOP
    -- Check if payment record already exists for this doctor and period
    IF NOT EXISTS (
      SELECT 1 FROM public.doctor_payments 
      WHERE doctor_id = doctor_record.id 
        AND period_start = period_start 
        AND period_end = period_end
    ) THEN
      -- Calculate earnings for this doctor
      SELECT * INTO earnings_data
      FROM public.calculate_doctor_earnings(
        doctor_record.id, 
        period_start, 
        period_end
      );
      
      -- Only insert if there are earnings
      IF earnings_data.total_earnings > 0 THEN
        INSERT INTO public.doctor_payments (
          doctor_id,
          period_start,
          period_end,
          appointment_count,
          ot_count,
          consultation_earnings,
          ot_earnings,
          total_earnings,
          payment_status
        ) VALUES (
          doctor_record.id,
          period_start,
          period_end,
          earnings_data.appointment_count,
          earnings_data.ot_count,
          earnings_data.consultation_earnings,
          earnings_data.ot_earnings,
          earnings_data.total_earnings,
          'pending'
        );
        
        inserted_count := inserted_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;