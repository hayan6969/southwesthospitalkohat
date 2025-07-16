-- Create table for daily closing reports
CREATE TABLE public.daily_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_date DATE NOT NULL,
  closing_time TIMESTAMP WITH TIME ZONE NOT NULL,
  day_name TEXT NOT NULL,
  hospital_revenue NUMERIC NOT NULL DEFAULT 0,
  pharmacy_revenue NUMERIC NOT NULL DEFAULT 0,
  pharmacy_profit NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  total_refunds NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  transactions_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

-- Create policies for daily closings
CREATE POLICY "Finance users can view all daily closings" 
ON public.daily_closings 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = ANY(ARRAY['finance', 'admin'])
));

CREATE POLICY "Finance users can create daily closings" 
ON public.daily_closings 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = ANY(ARRAY['finance', 'admin'])
));

-- Create index for faster queries
CREATE INDEX idx_daily_closings_date ON public.daily_closings(closing_date);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_closings_updated_at
BEFORE UPDATE ON public.daily_closings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();