-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  prescription_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for prescriptions
CREATE POLICY "Doctors can create prescriptions for their appointments" 
ON public.prescriptions 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view their own prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own prescriptions" 
ON public.prescriptions 
FOR UPDATE 
USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their own prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Staff and admins can view all prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'staff')
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();