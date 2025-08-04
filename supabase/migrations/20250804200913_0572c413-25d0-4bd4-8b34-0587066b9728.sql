-- Create X-ray tests table (similar to lab_tests)
CREATE TABLE public.xray_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC NOT NULL,
  preparation_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on xray_tests
ALTER TABLE public.xray_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for xray_tests
CREATE POLICY "Everyone can view xray tests" 
ON public.xray_tests 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage xray tests" 
ON public.xray_tests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Create X-ray reports table (similar to lab_reports)
CREATE TABLE public.xray_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  test_id UUID,
  test_name TEXT NOT NULL,
  xray_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  price NUMERIC DEFAULT 0,
  invoice_id UUID,
  notes TEXT,
  external_doctor_name TEXT,
  results TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on xray_reports
ALTER TABLE public.xray_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for xray_reports
CREATE POLICY "Allow all operations on xray reports" 
ON public.xray_reports 
FOR ALL 
USING (true);

-- Add trigger for updated_at on xray_tests
CREATE TRIGGER update_xray_tests_updated_at
BEFORE UPDATE ON public.xray_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();