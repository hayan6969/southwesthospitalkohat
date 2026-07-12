# Finance Discount & Revenue Consistency Fix

## Problems found

**1. Discounts are double-counted against profit.**
`PreviousBillDiscountDialog` does two things when a discount is applied:
- Reduces the underlying `invoices.amount` (and `lab_reports.amount` for lab) by the discount value → revenue drops.
- Also inserts a `refunds` row with `refund_type = 'discount_adjustment'` → same amount is subtracted again as a refund.

Net profit therefore drops by `2 × discount`. The refund entry is meant to be an audit trail only, not a second deduction.

**2. X-ray revenue is inconsistent between pages.**
Only `FinanceDaily.tsx` now reads X-ray revenue from `XR-` invoices (so discounts show up). These files still sum `xray_reports.price`, which is never updated when a discount is applied:
- `src/hooks/useFinancialAnalytics.ts`
- `src/components/AdminFinanceAnalytics.tsx`
- `src/utils/analyticsReportGenerator.ts`
- `src/components/DetailedDailyReport.tsx` (detailed X-ray line items)

## Fix

### A. Stop double-counting `discount_adjustment` refunds
In every place that computes `totalRefunds`, exclude rows where `refund_type = 'discount_adjustment'`. Keep them visible in the Refunds page/history as an audit record, but do not subtract them from profit — the invoice amount has already been reduced.

Files:
- `src/pages/dashboard/finance/FinanceDaily.tsx` — `totalRefunds`, `otherRefunds`, and the detailed data passed to the PDF report.
- `src/hooks/useFinancialAnalytics.ts` — `totalRefunds` aggregate.
- `src/components/AdminFinanceAnalytics.tsx` — refunds subtraction in net profit.
- `src/utils/analyticsReportGenerator.ts` — `totalRefunds` used by the PDF.
- `src/components/DetailedDailyReport.tsx` — refund totals shown in the detailed report.

### B. Make X-ray revenue everywhere read from `XR-` invoices
Switch the four remaining call sites to sum `invoices.amount WHERE invoice_number LIKE 'XR-%' AND status = 'paid'` (mirroring the lab-invoices pattern already used). This way a discount on an X-ray bill reduces X-ray revenue everywhere — Daily, Analytics, Admin Analytics, PDF report, Detailed report.

For `DetailedDailyReport` line items, join each `XR-` invoice back to its `xray_reports` row (via `invoice_id`) so the test name/patient still render, but the amount comes from the invoice.

### C. Sanity checks after edit
- Discount 700 on an XR- bill: X-ray revenue drops by 700, refunds row visible in history, net profit drops by exactly 700 (not 1400).
- Discount on a lab bill: lab revenue drops by discount, refunds not double-subtracted.
- Discount on an appointment (consultation) bill: hospital revenue / doctor payout drop as they already do, refund not double-subtracted.
- Real refunds (`lab`, `xray`, `ot`, `pharmacy_invoice`, `emergency`, etc.) continue to subtract from profit as today.

## Out of scope
No schema changes. No changes to how discounts are captured or authorized. Refunds page keeps showing `discount_adjustment` rows so the audit trail is preserved.
