-- Create pharmacy_account table to store starting balance and account information
CREATE TABLE public.pharmacy_account (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.pharmacy_account ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy account
CREATE POLICY "Finance users can view pharmacy account" 
ON public.pharmacy_account 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin', 'pharmacy')
));

CREATE POLICY "Finance users can create pharmacy account" 
ON public.pharmacy_account 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can update pharmacy account" 
ON public.pharmacy_account 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

-- Create trigger for updated_at
CREATE TRIGGER update_pharmacy_account_updated_at
BEFORE UPDATE ON public.pharmacy_account
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default record if none exists
INSERT INTO public.pharmacy_account (starting_balance, notes)
SELECT 0, 'Initial pharmacy account setup'
WHERE NOT EXISTS (SELECT 1 FROM public.pharmacy_account);