-- =============================================
-- Lab Register discounts — robust fix via the EXACT invoice link
-- =============================================
-- lab_pathology_orders already links order -> report (report_id) and
-- order -> invoice (invoice_id), so each report's invoice and its true
-- (discount-reflecting) charge can be derived EXACTLY — no patient+day guessing.
-- This supersedes the heuristic backfill in 20260625140000 and removes the
-- "multiple same-day reports" and "UTC/PKT day boundary" ambiguities.
--
-- Self-contained + idempotent: safe to run whether or not 20260625140000 ran.

-- Columns (no-ops if a prior migration already added them)
ALTER TABLE public.lab_pathology_reports
  ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.lab_pathology_report_test_types
  ADD COLUMN IF NOT EXISTS price_snapshot numeric;

-- 1. EXACT link: report.invoice_id from the order that points to this report.
--    Guard against orders whose invoice was since deleted (the report.invoice_id
--    FK would otherwise reject the dangling id) — those fall through to step 2/4.
UPDATE public.lab_pathology_reports lpr
SET invoice_id = o.invoice_id
FROM public.lab_pathology_orders o
WHERE o.report_id = lpr.id
  AND o.invoice_id IS NOT NULL
  AND lpr.invoice_id IS NULL
  AND EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = o.invoice_id);

-- 2. Heuristic link ONLY for reports with no order (rare: direct/walk-in reports).
--    Matches paid lab invoices for the same patient on the same day.
UPDATE public.lab_pathology_reports lpr
SET invoice_id = sub.inv_id
FROM (
  SELECT DISTINCT ON (lpr.id) lpr.id AS rid, inv.id AS inv_id
  FROM public.lab_pathology_reports lpr
  JOIN public.invoices inv
    ON inv.patient_id = lpr.patient_id
   AND inv.created_at::date = lpr.created_at::date
   AND (inv.invoice_number LIKE 'PATH-INV-%'
        OR inv.invoice_number LIKE 'LAB-%'
        OR inv.description ILIKE 'Lab:%')
   AND inv.status = 'paid'
  WHERE lpr.invoice_id IS NULL
  ORDER BY lpr.id, inv.created_at DESC
) sub
WHERE lpr.id = sub.rid;

-- 3. amount = the linked invoice's CURRENT amount (reflects any applied discount).
--    Authoritative — overrides any earlier catalog-price backfill.
UPDATE public.lab_pathology_reports lpr
SET amount = inv.amount
FROM public.invoices inv
WHERE lpr.invoice_id = inv.id;

-- 4. Catalog fallback for reports that still have no invoice link
UPDATE public.lab_pathology_reports lpr
SET amount = (
  SELECT COALESCE(SUM(lt.price), 0)
  FROM public.lab_pathology_report_test_types lptt
  JOIN public.lab_test_types lt ON lptt.test_type_id = lt.id
  WHERE lptt.report_id = lpr.id
)
WHERE lpr.amount IS NULL;
