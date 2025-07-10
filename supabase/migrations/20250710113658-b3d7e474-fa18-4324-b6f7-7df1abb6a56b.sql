-- Create doctor availability table
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  availability_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, availability_date)
);

-- Enable Row Level Security
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor availability
CREATE POLICY "Doctors can manage their own availability" 
ON public.doctor_availability 
FOR ALL 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Allow all users to view doctor availability" 
ON public.doctor_availability 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create doctor daily status table for stopping appointments for today
CREATE TABLE public.doctor_daily_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  status_date DATE NOT NULL,
  accepting_appointments BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, status_date)
);

-- Enable Row Level Security
ALTER TABLE public.doctor_daily_status ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor daily status
CREATE POLICY "Doctors can manage their own daily status" 
ON public.doctor_daily_status 
FOR ALL 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Allow all users to view doctor daily status" 
ON public.doctor_daily_status 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_doctor_daily_status_updated_at
BEFORE UPDATE ON public.doctor_daily_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();