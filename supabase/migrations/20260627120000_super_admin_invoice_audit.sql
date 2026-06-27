-- =============================================
-- Super Admin Role + Invoice Audit Trail
-- =============================================
-- Part 1: invoice_audit_log table + indexes + RLS
-- Part 2: trigger function + trigger on invoices
-- =============================================

-- 1. Create invoice_audit_log table
CREATE TABLE public.invoice_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid,
  invoice_number text,
  operation    text NOT NULL,
  changed_by   uuid REFERENCES public.profiles(id),
  changed_at   timestamptz NOT NULL DEFAULT now(),
  old_amount   numeric,
  new_amount   numeric,
  old_status   text,
  new_status   text,
  old_row      jsonb,
  new_row      jsonb,
  changed_fields text[]
);

CREATE INDEX invoice_audit_changed_at ON public.invoice_audit_log (changed_at DESC);
CREATE INDEX invoice_audit_invoice     ON public.invoice_audit_log (invoice_id);

-- 2. RLS
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin reads invoice audit" ON public.invoice_audit_log
  FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin'));

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE changed text[] := '{}';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN changed := changed || 'amount'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN changed := changed || 'status'; END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN changed := changed || 'description'; END IF;
    IF array_length(changed,1) IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields)
    VALUES (NEW.id, NEW.invoice_number, 'updated', auth.uid(),
      OLD.amount, NEW.amount, OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW), changed);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      new_amount, new_status, new_row)
    VALUES (NEW.id, NEW.invoice_number, 'created', auth.uid(), NEW.amount, NEW.status, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
      old_amount, old_status, old_row)
    VALUES (OLD.id, OLD.invoice_number, 'deleted', auth.uid(), OLD.amount, OLD.status, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

-- 4. Trigger on invoices
CREATE TRIGGER trg_invoice_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_change();
