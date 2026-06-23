// Staff may correct an invoice for a short window after it is created.
// After the window closes the invoice is locked (read-only) for staff.
export const INVOICE_EDIT_WINDOW_HOURS = 2;
const EDIT_WINDOW_MS = INVOICE_EDIT_WINDOW_HOURS * 60 * 60 * 1000;

// Invoice types that staff are allowed to edit within the window.
// (Lab + consultation are real `invoices` rows; X-ray is backed by xray_reports.)
export const EDITABLE_INVOICE_TYPES = ["lab", "xray", "appointments"] as const;

export function isInvoiceEditable(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= EDIT_WINDOW_MS;
}

// Human-friendly "time left to edit", e.g. "1h 12m left" / "8m left". Empty once expired.
export function formatEditWindowRemaining(createdAt?: string | null): string {
  if (!createdAt) return "";
  const remaining = EDIT_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
  if (remaining <= 0) return "";
  const totalMin = Math.floor(remaining / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m left to edit`;
  if (m > 0) return `${m}m left to edit`;
  return "< 1m left to edit";
}
