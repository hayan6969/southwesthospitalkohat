-- Create expense records for existing hospital-related refunds
INSERT INTO public.expenses (amount, category, description, expense_date, created_by)
SELECT 
  r.amount,
  'Refund' as category,
  CASE 
    WHEN r.refund_type = 'ot_simple' THEN 'OT Simple refund: ' || COALESCE(r.description, '')
    WHEN r.refund_type = 'lab' THEN 'Lab refund: ' || COALESCE(r.description, '')
    WHEN r.refund_type = 'pharmacy' THEN 'Pharmacy refund: ' || COALESCE(r.description, '')
    WHEN r.refund_type = 'other' THEN 'Other refund: ' || COALESCE(r.description, '')
  END as description,
  r.created_at::date as expense_date,
  r.processed_by as created_by
FROM public.refunds r
WHERE r.refund_type IN ('ot_simple', 'lab', 'pharmacy', 'other')
  AND NOT EXISTS (
    SELECT 1 FROM public.expenses e 
    WHERE e.description ILIKE '%refund%' 
    AND e.amount = r.amount 
    AND e.expense_date = r.created_at::date
  );