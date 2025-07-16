-- Create function to insert daily closing
CREATE OR REPLACE FUNCTION public.create_daily_closing(
  p_closing_date DATE,
  p_closing_time TIMESTAMP WITH TIME ZONE,
  p_day_name TEXT,
  p_hospital_revenue NUMERIC,
  p_pharmacy_revenue NUMERIC,
  p_pharmacy_profit NUMERIC,
  p_total_expenses NUMERIC,
  p_total_refunds NUMERIC,
  p_net_profit NUMERIC,
  p_transactions_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  closing_id UUID;
BEGIN
  INSERT INTO public.daily_closings (
    closing_date, closing_time, day_name, hospital_revenue, 
    pharmacy_revenue, pharmacy_profit, total_expenses, 
    total_refunds, net_profit, transactions_data
  ) VALUES (
    p_closing_date, p_closing_time, p_day_name, p_hospital_revenue,
    p_pharmacy_revenue, p_pharmacy_profit, p_total_expenses,
    p_total_refunds, p_net_profit, p_transactions_data
  ) RETURNING id INTO closing_id;
  
  RETURN closing_id;
END;
$$;

-- Create function to get last daily closing
CREATE OR REPLACE FUNCTION public.get_last_daily_closing()
RETURNS TABLE(
  id UUID,
  closing_date DATE,
  closing_time TIMESTAMP WITH TIME ZONE,
  day_name TEXT,
  hospital_revenue NUMERIC,
  pharmacy_revenue NUMERIC,
  pharmacy_profit NUMERIC,
  total_expenses NUMERIC,
  total_refunds NUMERIC,
  net_profit NUMERIC,
  transactions_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT dc.* FROM public.daily_closings dc
  ORDER BY dc.closing_date DESC
  LIMIT 1;
END;
$$;