-- Create table for OT operation types and their associated expenses
CREATE TABLE public.ot_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for OT expenses linked to operations
CREATE TABLE public.ot_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.ot_operations(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ot_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for OT operations
CREATE POLICY "Everyone can view OT operations" 
ON public.ot_operations 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage OT operations" 
ON public.ot_operations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create policies for OT expenses
CREATE POLICY "Everyone can view OT expenses" 
ON public.ot_expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage OT expenses" 
ON public.ot_expenses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create trigger for updating timestamps
CREATE TRIGGER update_ot_operations_updated_at
  BEFORE UPDATE ON public.ot_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_expenses_updated_at
  BEFORE UPDATE ON public.ot_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();