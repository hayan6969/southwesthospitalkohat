-- Create assessment entries table
CREATE TABLE public.assessment_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_schedule_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
  assessment TEXT,
  plan TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assessment_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment entries
CREATE POLICY "Everyone can view assessment entries" 
ON public.assessment_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and nursing can create assessment entries" 
ON public.assessment_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'nursing')
));

CREATE POLICY "Medical staff can update assessment entries" 
ON public.assessment_entries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
));

CREATE POLICY "Medical staff can delete assessment entries" 
ON public.assessment_entries 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('staff', 'nursing', 'doctor', 'ota', 'admin')
));

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_assessment_entries_updated_at
  BEFORE UPDATE ON public.assessment_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();