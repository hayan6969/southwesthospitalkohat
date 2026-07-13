type InvoiceLike = {
  invoice_number?: string | null;
  description?: string | null;
  emergency_patient_data?: unknown;
  patient_id?: string | null;
  amount?: number | string | null;
  created_at?: string | null;
};

type OTScheduleLike = {
  patient_id?: string | null;
  total_cost?: number | string | null;
  created_at?: string | null;
};

const OT_MATCH_WINDOW_MS = 5 * 60 * 1000;

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const toTimestamp = (value: string | null | undefined) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const isOtInvoiceRecord = (invoice: InvoiceLike) => {
  const description = invoice.description?.toLowerCase() || "";
  return /^OT-/i.test(invoice.invoice_number || "") || description.includes("ot procedure") || description.includes("operation theater");
};

export const isLabInvoiceRecord = (invoice: InvoiceLike) => {
  const number = invoice.invoice_number || "";
  const description = invoice.description?.toLowerCase() || "";
  // Pathology billing uses PATH-INV- (and older flows LAB-); the "Lab: …"
  // description is the reliable fallback regardless of numbering scheme.
  return /^(LAB-|PATH-INV-)/i.test(number) || /^lab[:\s]/.test(description);
};

export const isXrayInvoiceRecord = (invoice: InvoiceLike) => {
  const description = invoice.description?.toLowerCase() || "";
  return /^XR(?:AY)?-/i.test(invoice.invoice_number || "") || description.includes("x-ray") || description.includes("xray");
};

export const isManualInvoiceRecord = (invoice: InvoiceLike) => {
  return /^MAN-/i.test(invoice.invoice_number || "");
};

export const getHospitalInvoiceType = (invoice: InvoiceLike) => {
  const description = invoice.description?.toLowerCase() || "";

  if (isManualInvoiceRecord(invoice)) return "manual" as const;

  if (
    description.includes("emergency consultation") ||
    description.includes("emergency") ||
    Boolean(invoice.emergency_patient_data) ||
    /^EMG-/i.test(invoice.invoice_number || "") ||
    /^EMERGENCY-/i.test(invoice.invoice_number || "")
  ) {
    return "emergency" as const;
  }

  if (isOtInvoiceRecord(invoice)) return "ot" as const;
  if (isLabInvoiceRecord(invoice)) return "lab" as const;
  if (isXrayInvoiceRecord(invoice)) return "xray" as const;

  return "appointment" as const;
};

export const hasMatchingOtHospitalInvoice = (otSchedule: OTScheduleLike, hospitalInvoices: InvoiceLike[]) => {
  const otCreatedAt = toTimestamp(otSchedule.created_at);

  if (!otSchedule.patient_id || otCreatedAt === null) {
    return false;
  }

  return hospitalInvoices.some((invoice) => {
    const invoiceCreatedAt = toTimestamp(invoice.created_at);

    return (
      isOtInvoiceRecord(invoice) &&
      invoice.patient_id === otSchedule.patient_id &&
      toNumber(invoice.amount) === toNumber(otSchedule.total_cost) &&
      invoiceCreatedAt !== null &&
      Math.abs(invoiceCreatedAt - otCreatedAt) <= OT_MATCH_WINDOW_MS
    );
  });
};

/**
 * Remove duplicate invoices. Two invoices are treated as duplicates ONLY when
 * they share the same id or the same invoice_number. The older fuzzy rule
 * (same patient + same amount within 2 minutes) also collapsed legitimate
 * separate bills (e.g. two Rs. 100 BLOOD GROUP tests for the same patient in
 * quick succession) and made them invisible in the invoice list.
 */
export const deduplicateInvoices = <T extends InvoiceLike & { id?: string; invoice_number?: string | null }>(
  invoices: T[],
): T[] => {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const inv of invoices) {
    const key = inv.id || inv.invoice_number || '';
    if (!key) {
      kept.push(inv);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(inv);
  }
  return kept;
};
