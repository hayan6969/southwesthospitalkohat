-- Create emergency_expenses table
CREATE TABLE public.emergency_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on emergency_expenses
ALTER TABLE public.emergency_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency_expenses
CREATE POLICY "Finance and admin users can view all emergency expenses" 
ON public.emergency_expenses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role IN ('finance', 'admin', 'staff')
));

CREATE POLICY "Admin users can create emergency expenses" 
ON public.emergency_expenses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admin users can update emergency expenses" 
ON public.emergency_expenses 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admin users can delete emergency expenses" 
ON public.emergency_expenses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_emergency_expenses_updated_at
BEFORE UPDATE ON public.emergency_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();