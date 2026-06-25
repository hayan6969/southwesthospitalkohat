-- =============================================
-- Fix: Lab Reports Register shows discounted amounts
-- Adds amount column to lab_pathology_reports
-- Backfills from invoices (patient_id + same day)
-- =============================================

-- 1. Add amount column to lab_pathology_reports (final charge, after discount)
ALTER TABLE public.lab_pathology_reports
  ADD COLUMN IF NOT EXISTS amount numeric;

-- 2. Backfill amount from matching invoices (same patient, same day, LAB pattern)
UPDATE public.lab_pathology_reports lpr
SET amount = sub.amount
FROM (
  SELECT DISTINCT ON (lpr.id) lpr.id, inv.amount
  FROM public.lab_pathology_reports lpr
  JOIN public.invoices inv ON lpr.patient_id = inv.patient_id
    AND lpr.created_at::date = inv.created_at::date
    AND inv.invoice_number LIKE 'LAB-%'
    AND inv.status = 'paid'
  WHERE lpr.amount IS NULL
  ORDER BY lpr.id, inv.created_at DESC
) sub
WHERE lpr.id = sub.id;

-- 3. For unmatched reports, use catalog price sum as default
UPDATE public.lab_pathology_reports lpr
SET amount = (
  SELECT COALESCE(SUM(lt.price), 0)
  FROM public.lab_pathology_report_test_types lptt
  JOIN public.lab_test_types lt ON lptt.test_type_id = lt.id
  WHERE lptt.report_id = lpr.id
)
WHERE lpr.amount IS NULL;

-- 4. Also add amount to lab_pathology_report_test_types junction table
--    (price_snapshot from previous migration, renamed for clarity)
ALTER TABLE public.lab_pathology_report_test_types
  ADD COLUMN IF NOT EXISTS price_snapshot numeric;
