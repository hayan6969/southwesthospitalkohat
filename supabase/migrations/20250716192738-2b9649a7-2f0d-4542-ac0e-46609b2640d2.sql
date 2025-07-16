-- Create doctor working hours table for weekly schedule
CREATE TABLE public.doctor_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_working BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

-- Create doctor specific day schedules table for individual day overrides
CREATE TABLE public.doctor_specific_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  specific_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_working BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, specific_date)
);

-- Enable RLS on new tables
ALTER TABLE public.doctor_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specific_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor working hours
CREATE POLICY "Anyone can view doctor working hours" 
ON public.doctor_working_hours 
FOR SELECT 
USING (true);

CREATE POLICY "Doctors can manage their own working hours" 
ON public.doctor_working_hours 
FOR ALL 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Staff and admins can view all doctor working hours" 
ON public.doctor_working_hours 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'staff')
));

-- Create policies for doctor specific schedules
CREATE POLICY "Anyone can view doctor specific schedules" 
ON public.doctor_specific_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Doctors can manage their own specific schedules" 
ON public.doctor_specific_schedules 
FOR ALL 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Staff and admins can view all doctor specific schedules" 
ON public.doctor_specific_schedules 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'staff')
));

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_doctor_working_hours
  BEFORE UPDATE ON public.doctor_working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_doctor_specific_schedules
  BEFORE UPDATE ON public.doctor_specific_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();