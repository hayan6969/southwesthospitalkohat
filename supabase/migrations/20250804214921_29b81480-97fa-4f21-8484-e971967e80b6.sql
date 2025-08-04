-- Update all existing X-ray invoices to paid status (without updated_at column since it doesn't exist)
UPDATE public.invoices 
SET status = 'paid', 
    paid_at = now()
WHERE description ILIKE '%xray%' 
   OR description ILIKE '%x-ray%' 
   OR description ILIKE '%radiology%'
   OR invoice_number LIKE 'XRAY-%';

-- If there's a separate xray_reports table, update those too
UPDATE public.xray_reports 
SET status = 'completed'
WHERE status != 'completed';

-- Create a trigger function to automatically set X-ray invoices as paid
CREATE OR REPLACE FUNCTION public.auto_set_xray_paid()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is an X-ray related invoice
    IF (NEW.description ILIKE '%xray%' 
        OR NEW.description ILIKE '%x-ray%' 
        OR NEW.description ILIKE '%radiology%'
        OR NEW.invoice_number LIKE 'XRAY-%') THEN
        
        -- Set status to paid and record payment time
        NEW.status = 'paid';
        NEW.paid_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new invoices
DROP TRIGGER IF EXISTS auto_xray_payment_trigger ON public.invoices;
CREATE TRIGGER auto_xray_payment_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_xray_paid();

-- Create trigger function for xray_reports if the table exists
CREATE OR REPLACE FUNCTION public.auto_set_xray_reports_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set X-ray reports as completed when scheduled
    NEW.status = 'completed';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for xray_reports (but only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xray_reports') THEN
        DROP TRIGGER IF EXISTS auto_xray_reports_completion_trigger ON public.xray_reports;
        CREATE TRIGGER auto_xray_reports_completion_trigger
            BEFORE INSERT OR UPDATE ON public.xray_reports
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_xray_reports_completed();
    END IF;
END $$;