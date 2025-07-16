-- Create refunds table to track all refunds
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  refund_type TEXT NOT NULL, -- 'consultation', 'ot', 'lab', 'pharmacy', 'other'
  description TEXT NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id), -- null if not doctor-related
  patient_id UUID, -- optional patient reference
  related_record_id UUID, -- id of related appointment/ot_schedule/lab_report/etc
  processed_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create policies for refunds
CREATE POLICY "Finance users can view all refunds" 
ON public.refunds 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can create refunds" 
ON public.refunds 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can update refunds" 
ON public.refunds 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

-- Create trigger for updated_at
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();