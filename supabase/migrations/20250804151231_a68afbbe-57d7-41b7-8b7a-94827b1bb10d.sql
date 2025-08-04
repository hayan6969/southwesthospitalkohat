-- Create miscellaneous income table
CREATE TABLE public.miscellaneous_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.miscellaneous_income ENABLE ROW LEVEL SECURITY;

-- Create policies for miscellaneous income
CREATE POLICY "Finance users can create miscellaneous income" 
ON public.miscellaneous_income 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('finance', 'admin')
  )
);

CREATE POLICY "Finance users can view all miscellaneous income" 
ON public.miscellaneous_income 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('finance', 'admin')
  )
);

CREATE POLICY "Finance users can update miscellaneous income" 
ON public.miscellaneous_income 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('finance', 'admin')
  )
);

CREATE POLICY "Finance users can delete miscellaneous income" 
ON public.miscellaneous_income 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('finance', 'admin')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_miscellaneous_income_updated_at
BEFORE UPDATE ON public.miscellaneous_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();