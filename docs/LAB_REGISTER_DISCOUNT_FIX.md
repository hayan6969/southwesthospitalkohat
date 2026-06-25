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

> **Update (robust v2):** the original v1 stored `amount` and matched reports → invoices by `patient_id` + same day. That heuristic mis-fired in two cases (multiple lab reports for one patient on a day; the UTC vs Pakistan day boundary) and its backfill used the wrong invoice prefix (`LAB-%` — pathology invoices are `PATH-INV-`). **v2 keys off the exact invoice link instead.** `lab_pathology_orders` already stores both `invoice_id` *and* `report_id`, so each report's invoice — and its true, discount-reflecting charge — is derived exactly, with no date/patient guessing.

### Approach: Store final charge on the report, keyed by the exact invoice link

We populate **`lab_pathology_reports.invoice_id`** (the column existed but was never filled) and store the definitive **`amount`** on the report:

1. **At creation** — `PathologyReportWizard` copies `invoice_id` + the order's `total_amount` from the billed order onto the new report.
2. **Backfilled** — migration `20260625150000` links each report to its invoice via `lab_pathology_orders.report_id → invoice_id` (exact), falling back to patient+day only for order-less reports, then sets `amount` from the linked invoice's current amount (so past discounts are already reflected), then catalog price as a last resort.
3. **Updated on retroactive discount** — `PreviousBillDiscountDialog` updates reports by `invoice_id` (exact); a patient+day fallback covers only unlinked legacy rows.

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
| `supabase/migrations/20260625140000_fix_lab_register_discounts.sql` | v1 — adds `amount` + `price_snapshot` columns + heuristic backfill (prefix corrected to `PATH-INV-`/`LAB-`/`Lab:%`) |
| `supabase/migrations/20260625150000_lab_register_invoice_link.sql` | **v2 (authoritative)** — exact link via `lab_pathology_orders.report_id → invoice_id`; sets `amount` from the linked invoice; idempotent, self-contained |
| `src/components/lab/PathologyReportWizard.tsx` | Sets `invoice_id` + `amount` on the report at creation from the billed order |
| `src/components/lab/LabReportsTracking.tsx` | Reads `r.amount` directly; charge priority `amount` → `price_snapshot` → catalog |
| `src/components/dialogs/PreviousBillDiscountDialog.tsx` | Lab discount updates reports by `invoice_id` (exact) + unlinked patient/day fallback; `inferServiceType` uses `\blab\b`/`path-inv-` (no "labor" false-positive); consultation discount adjusts doctor earnings |

---

## Resolved in v2

- ✅ **PathologyReportWizard** now populates `invoice_id` + `amount` at report creation (from the billed order).
- ✅ **Multiple lab reports for one patient/day** — handled by the exact `invoice_id` link; the patient+day path is now a fallback restricted to unlinked rows.
- ✅ **UTC vs Pakistan day boundary** — no longer relevant for linked reports (no date matching). It only affects the legacy fallback for order-less reports.

## Future Considerations

- **EnhancedLabDialog**: Could also create a `lab_pathology_reports` entry to unify the two lab workflows.
- **Validation**: Add a DB constraint or trigger ensuring `amount >= 0` on `lab_pathology_reports`.
- **`price_snapshot`**: still unwritten — populate it at report creation if per-test (not per-invoice) charges are ever needed.
