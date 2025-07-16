-- Create pharmacy_expenses table to track profit withdrawals and other pharmacy-specific expenses
CREATE TABLE public.pharmacy_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  expense_type TEXT NOT NULL DEFAULT 'profit_withdrawal',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy expenses
CREATE POLICY "Finance users can view pharmacy expenses" 
ON public.pharmacy_expenses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin', 'pharmacy')
));

CREATE POLICY "Finance users can create pharmacy expenses" 
ON public.pharmacy_expenses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can update pharmacy expenses" 
ON public.pharmacy_expenses 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

CREATE POLICY "Finance users can delete pharmacy expenses" 
ON public.pharmacy_expenses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('finance', 'admin')
));

-- Create trigger for updated_at
CREATE TRIGGER update_pharmacy_expenses_updated_at
BEFORE UPDATE ON public.pharmacy_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();