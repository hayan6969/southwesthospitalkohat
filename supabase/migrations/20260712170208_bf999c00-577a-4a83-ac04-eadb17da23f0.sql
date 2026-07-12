UPDATE public.lab_pathology_reports r
SET amount = i.amount,
    updated_at = now()
FROM public.invoices i
WHERE r.invoice_id = i.id
  AND i.status = 'paid'
  AND (r.amount IS DISTINCT FROM i.amount);