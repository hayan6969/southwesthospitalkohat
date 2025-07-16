-- Create hospital closing balance table
CREATE TABLE public.hospital_closing_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_date DATE NOT NULL UNIQUE,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.hospital_closing_balance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Finance users can view hospital closing balance" 
ON public.hospital_closing_balance 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('finance', 'admin')
  )
);

CREATE POLICY "Finance users can create hospital closing balance" 
ON public.hospital_closing_balance 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('finance', 'admin')
  )
);

CREATE POLICY "Finance users can update hospital closing balance" 
ON public.hospital_closing_balance 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('finance', 'admin')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hospital_closing_balance_updated_at
  BEFORE UPDATE ON public.hospital_closing_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();