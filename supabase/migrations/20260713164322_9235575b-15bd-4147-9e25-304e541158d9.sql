CREATE OR REPLACE FUNCTION public.sync_pathology_amounts_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    UPDATE public.lab_pathology_orders
       SET total_amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND total_amount IS DISTINCT FROM NEW.amount;

    UPDATE public.lab_pathology_reports
       SET amount = NEW.amount,
           updated_at = now()
     WHERE invoice_id = NEW.id
       AND amount IS DISTINCT FROM NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lab_report_amount ON public.invoices;
DROP TRIGGER IF EXISTS trg_sync_pathology_amounts ON public.invoices;
CREATE TRIGGER trg_sync_pathology_amounts
AFTER UPDATE OF amount ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_pathology_amounts_from_invoice();

UPDATE public.lab_pathology_orders o
   SET total_amount = i.amount,
       updated_at = now()
  FROM public.invoices i
 WHERE o.invoice_id = i.id
   AND i.status = 'paid'
   AND o.total_amount IS DISTINCT FROM i.amount;

UPDATE public.lab_pathology_reports r
   SET amount = i.amount,
       updated_at = now()
  FROM public.invoices i
 WHERE r.invoice_id = i.id
   AND i.status = 'paid'
   AND r.amount IS DISTINCT FROM i.amount;