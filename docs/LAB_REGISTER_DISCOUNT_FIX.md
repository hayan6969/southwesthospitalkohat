# Lab Reports Register — Discount Not Reflected Fix

## The Problem

When a discount was applied to a lab invoice (either during creation via `EnhancedLabDialog` or retroactively via `PreviousBillDiscountDialog`), the **Lab Reports Register** (`LabReportsTracking.tsx`) continued to show the full catalog price as the charge. The register only ever displayed `lab_test_types.price` (current catalog price) — discounts were invisible.

### Root Cause

Two separate issues:

1. **No data link between pathology reports and invoices.** The `lab_pathology_reports` table had an `invoice_id` column, but it was **never populated** by either the pathology workflow (`PathologyReportWizard`) or the lab order flow (`EnhancedLabDialog`). The simple lab flow creates records in `lab_reports` (which does have `invoice_id`), but the register reads from `lab_pathology_reports`. No mechanism connected the two.

2. **Retroactive discounts didn't propagate to reports.** When `PreviousBillDiscountDialog` reduced an invoice's `amount`, nothing updated the corresponding `lab_pathology_reports` rows.

### Impact

- Finance reports showed inflated lab revenue (catalog prices instead of actual charged amounts)
- Lab register totals didn't match invoice totals
- Staff couldn't verify discounts took effect from the register view
- Top test / test frequency stats used undiscounted prices

---

## The Fix

### Approach: Store final charge directly on the report

Instead of trying to link reports → invoices (which requires `invoice_id` to be populated — it never was), we add an **`amount` column** directly to `lab_pathology_reports` that stores the definitive charge. This column can be:

1. **Backfilled** from matching invoices (by `patient_id` + same day)
2. **Updated** when a retroactive discount is applied
3. **Populated at creation** for future reports

### Changes Made

#### SQL Migration (`supabase/migrations/20260625140000_fix_lab_register_discounts.sql`)

| Step | Operation | Purpose |
|------|-----------|---------|
| 1 | `ALTER TABLE … ADD COLUMN amount numeric` | New nullable column on `lab_pathology_reports` |
| 2 | `UPDATE … FROM invoices … patient_id + same day` | Backfill from invoices with `LAB-%` pattern, paid status |
| 3 | `UPDATE … SUM(lt.price)` | For unmatched reports, use catalog price as default |
| 4 | `ALTER TABLE … ADD COLUMN price_snapshot numeric` | On junction table for future report creation |

#### Code: `src/components/lab/LabReportsTracking.tsx`

- Changed query to select `amount` from `lab_pathology_reports` directly
- Removed complex `lab_reports` + invoice batch-fetch logic
- Charge priority: `r.amount` > `price_snapshot` sum > catalog price sum

#### Code: `src/components/dialogs/PreviousBillDiscountDialog.tsx`

- Added `doctor_id` to invoice search queries
- **Consultation discounts**: reduces `doctor_payments.consultation_earnings` and `total_earnings` for pending payments
- **Lab discounts**: updates `lab_pathology_reports.amount` for the same patient + date

### Charge Resolution Order

```
1. r.amount            → stored on report (backfilled from invoice)
2. price_snapshot sum  → snapshot at report creation time (future)
3. catalog price sum   → current lab_test_types.price (fallback)
```

---

## How to Verify

### SQL check after migration

```sql
SELECT COUNT(*) as total_reports,
       COUNT(amount) FILTER (WHERE amount IS NOT NULL) as with_amount,
       ROUND(SUM(COALESCE(amount, 0))::numeric, 0) as total_amount
FROM public.lab_pathology_reports
WHERE created_at >= '2026-06-25'::date
  AND created_at < '2026-06-26'::date;
```

- `total_reports` should match `with_amount` (after backfill)
- `total_amount` should reflect discounted totals

### UI check

- Open Lab Reports Register (`/dashboard/lab?tab=reports`)
- Total Charges card should match invoice totals, not catalog sums
- Apply a discount via Previous Bill Discount → register should update after page refresh

---

## File Index

| File | What Changed |
|------|-------------|
| `supabase/migrations/20260625140000_fix_lab_register_discounts.sql` | New migration — adds `amount` + `price_snapshot` columns + backfill |
| `src/components/lab/LabReportsTracking.tsx` | Reads `r.amount` directly; simplified charge logic |
| `src/components/dialogs/PreviousBillDiscountDialog.tsx` | Updates `lab_pathology_reports.amount` on lab discount; adjusts doctor earnings on consultation discount |

---

## Future Considerations

- **PathologyReportWizard**: Should populate `amount` at report creation time (sum of selected test prices at that moment) to avoid relying on backfill
- **EnhancedLabDialog**: Could also create a `lab_pathology_reports` entry to unify the two lab workflows
- **Validation**: Add a DB constraint or trigger ensuring `amount >= 0` on `lab_pathology_reports`
