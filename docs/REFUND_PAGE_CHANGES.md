# Refund Page — Lab Cancellation + Refund Slip PDF

## Overview

Added lab test cancellation flow to `FinanceRefunds.tsx` with order lookup, per-test selection, invoice voiding, and branded refund slip PDF generation.

---

## Files Changed

### `src/pages/dashboard/finance/FinanceRefunds.tsx`

**New types:**
- `PathologyOrderItem` — test info within an order
- `PathologyOrder` — full order with items + patient profile

**New state:**
- `orderSearch` / `selectedOrder` / `orderSearchResults` / `searchingOrders` — order lookup
- `selectedTestIds` — checkboxes for which tests to cancel
- `showLabConfirm` — confirmation dialog for test cancellation

**New functions:**

| Function | Purpose |
|----------|---------|
| `lookupPathologyOrder()` | Searches `lab_pathology_orders` by `order_number` or by `invoice_number` (fallback). Fetches patient profile separately (no FK). |
| `toggleTestItem(itemId)` | Select/deselect individual tests for partial refund |
| `clearLabSelection()` | Reset lab selection state |
| `labRefundAmount` | Computed — sum of selected test prices |

**Refund mutation additions:**
- When `refundType === 'lab'`:
  1. Updates `lab_pathology_orders` → `payment_status: 'cancelled'`, `lab_status: 'cancelled'`
  2. Voids linked invoice → `invoices.status: 'cancelled'` (removes it from revenue)
  3. Inserts refund with `patient_id` + `related_record_id` (the order)
  4. Generates refund slip PDF via `generateRefundSlipPDF()`

**UI additions:**
- When `refundType === 'lab'`: search input + lookup button for pathology orders
- Selected order details card: patient info, status badges, test table with checkboxes
- Refund amount summary: selected count, total refund value
- Cancel button → confirmation dialog → completes refund flow

**Imports added:**
- `Separator` from `@/components/ui/separator`
- `generateRefundSlipPDF` from `@/utils/refundSlipGenerator`
- Icons: `X`, `AlertTriangle`

---

### `src/utils/refundSlipGenerator.ts` (new)

**Function:** `generateRefundSlipPDF(data)`

Generates a branded refund receipt PDF with:

| Section | Content |
|---------|---------|
| Header | Hospital logo (from `hospital_settings`), hospital name/address/phone |
| Title | "REFUND SLIP / CANCELLATION RECEIPT" |
| Info box | Refund #, Date, Patient Name, Patient ID, Contact, Order # |
| Items table | Selected cancelled tests with prices |
| Totals | Total Amount → Refund Amount (highlighted in green box) |
| Reason | Cancellation reason |
| Footer | "Refund Processed By", border, "NOT VALID FOR COURT" stamp |

**Branding:**
- Primary color: `#1e40af` (blue-800)
- Accent: `#b3211c` (red)
- Font: Helvetica (bold/normal/italic)
- Hospital logo loaded from `hospital_settings.logo_url` via canvas
- Printed at A4 size

**Error handling:** Silent catch on logo load failure (continues without logo).

---

### `src/utils/refundSlipGenerator.ts` — Full API

```typescript
interface RefundSlipItem {
  testName: string;
  price: number;
}

interface RefundSlipData {
  refundNumber: string;
  patientName: string;
  patientNumber: string;
  patientContact?: string | null;
  orderNumber: string;
  items: RefundSlipItem[];
  totalAmount: number;
  refundAmount: number;
  reason: string;
  processedBy: string;
  date: string;
}

async function generateRefundSlipPDF(data: RefundSlipData): Promise<void>
```

Opens PDF in new tab via `window.open(blobUrl)`.

---

## Data Flow

```
User selects "Lab" refund type
  → enters order/invoice number
  → clicks Lookup
  → fetches lab_pathology_orders + items
  → checks which tests to cancel
  → clicks "Cancel Selected Tests & Refund"
  → confirmation dialog
  → on confirm:

    1. UPDATE lab_pathology_orders SET payment_status='cancelled', lab_status='cancelled'
    2. UPDATE invoices SET status='cancelled' (voids from revenue)
    3. INSERT INTO refunds (amount, type, description, patient_id, related_record_id)
    4. generateRefundSlipPDF()
    5. Success toast + invalidate queries
```

---

## Related Files

| File | Role |
|------|------|
| `src/pages/dashboard/finance/FinanceRefunds.tsx` | UI + mutation for lab cancellation refunds |
| `src/utils/refundSlipGenerator.ts` | PDF generator for refund slip |
| `supabase/migrations/20260625150000_lab_register_invoice_link.sql` | Links reports to invoices via orders |
| `src/utils/prescriptionSlipGenerator.ts` | Similar PDF pattern (reference) |
| `src/utils/pdfGenerator.ts` | Other PDF generators in the app |
