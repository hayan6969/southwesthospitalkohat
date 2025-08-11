-- Create treatment chart entries table
CREATE TABLE public.treatment_chart_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_schedule_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  medicine TEXT,
  investigation TEXT,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.treatment_chart_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for treatment chart entries
CREATE POLICY "Users can view treatment chart entries" 
ON public.treatment_chart_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Doctors can create treatment chart entries" 
ON public.treatment_chart_entries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('doctor', 'admin', 'ota', 'staff')
));

CREATE POLICY "Doctors can update treatment chart entries" 
ON public.treatment_chart_entries 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('doctor', 'admin', 'ota', 'staff')
));

CREATE POLICY "Doctors can delete treatment chart entries" 
ON public.treatment_chart_entries 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('doctor', 'admin', 'ota', 'staff')
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_treatment_chart_entries_updated_at
BEFORE UPDATE ON public.treatment_chart_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();