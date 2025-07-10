-- Create lab_tests table for admin to manage lab tests and prices
CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT,
  normal_range TEXT,
  preparation_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for lab_tests
CREATE POLICY "Everyone can view lab tests" 
ON public.lab_tests 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage lab tests" 
ON public.lab_tests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Add test_id to lab_reports to link to lab_tests
ALTER TABLE public.lab_reports 
ADD COLUMN test_id UUID REFERENCES public.lab_tests(id),
ADD COLUMN price NUMERIC DEFAULT 0,
ADD COLUMN result_file_url TEXT,
ADD COLUMN invoice_id UUID;

-- Create trigger for updating updated_at
CREATE TRIGGER update_lab_tests_updated_at
BEFORE UPDATE ON public.lab_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();