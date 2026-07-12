-- Trigger: keep lab_pathology_reports.amount in sync with the linked invoice.
-- Fires whenever an invoice's amount changes so retroactive discounts, refunds,
-- or corrections are reflected in the Lab Reports Register without relying on
-- client-side update paths.

CREATE OR REPLACE FUNCTION public.sync_lab_report_amount_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
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
CREATE TRIGGER trg_sync_lab_report_amount
AFTER UPDATE OF amount ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_lab_report_amount_from_invoice();

-- One-off resync in case any rows are still stale from before the trigger existed.
UPDATE public.lab_pathology_reports r
   SET amount = i.amount,
       updated_at = now()
  FROM public.invoices i
 WHERE r.invoice_id = i.id
   AND i.status = 'paid'
   AND r.amount IS DISTINCT FROM i.amount;