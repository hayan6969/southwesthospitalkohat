-- =============================================
-- Fix trigger: use array_append to avoid
-- "malformed array literal" errors from
-- ambiguous || operator with text[].
-- Also wrap audit INSERT in a subtransaction
-- so a failure never breaks the main update.
--
-- Discount detection: if the amount decreased AND
-- the description contains "[Adjusted:" (set by
-- PreviousBillDiscountDialog), the operation is
-- logged as 'discounted' instead of 'updated'.
-- This lets the audit page correctly distinguish
-- genuine discounts from invoice edits that happen
-- to change the amount (e.g. adding/removing tests).
-- =============================================

CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  changed text[]     := ARRAY[]::text[];
  op      text       := 'updated';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      changed := array_append(changed, 'amount');
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      changed := array_append(changed, 'status');
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      changed := array_append(changed, 'description');
    END IF;
    IF array_length(changed, 1) IS NULL THEN RETURN NEW; END IF;

    -- Priority 1: cancellation (status → cancelled)
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      op := 'cancelled';
    -- Priority 2: genuine discount (amount ↓ + "[Adjusted:" marker)
    ELSIF (NEW.amount IS NOT NULL AND OLD.amount IS NOT NULL
        AND NEW.amount < OLD.amount
        AND NEW.description LIKE '%[Adjusted:%') THEN
      op := 'discounted';
    END IF;

    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, new_amount, old_status, new_status, old_row, new_row, changed_fields)
      VALUES (NEW.id, NEW.invoice_number, op, auth.uid(),
        OLD.amount, NEW.amount, OLD.status, NEW.status, to_jsonb(OLD), to_jsonb(NEW), changed);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        new_amount, new_status, new_row)
      VALUES (NEW.id, NEW.invoice_number, 'created', auth.uid(), NEW.amount, NEW.status, to_jsonb(NEW));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    BEGIN
      INSERT INTO public.invoice_audit_log(invoice_id, invoice_number, operation, changed_by,
        old_amount, old_status, old_row)
      VALUES (OLD.id, OLD.invoice_number, 'deleted', auth.uid(), OLD.amount, OLD.status, to_jsonb(OLD));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'invoice_audit_log insert failed for invoice %: %', OLD.id, SQLERRM;
    END;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
