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

export const isLabInvoiceRecord = (invoice: InvoiceLike) => /^LAB-/i.test(invoice.invoice_number || "");

export const isXrayInvoiceRecord = (invoice: InvoiceLike) => {
  const description = invoice.description?.toLowerCase() || "";
  return /^XR(?:AY)?-/i.test(invoice.invoice_number || "") || description.includes("x-ray") || description.includes("xray");
};

export const getHospitalInvoiceType = (invoice: InvoiceLike) => {
  const description = invoice.description?.toLowerCase() || "";

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
 * Remove duplicate hospital invoices.
 * Two invoices are duplicates when they share the same patient_id,
 * the same amount, and were created within a short time window.
 * The invoice with the shorter (older-style) invoice_number is kept.
 */
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export const deduplicateInvoices = <T extends InvoiceLike & { id?: string }>(invoices: T[]): T[] => {
  const kept: T[] = [];
  const seen = new Set<string>();

  for (const inv of invoices) {
    // Build a fuzzy key: patient + rounded amount
    const amt = toNumber(inv.amount);
    const ts = toTimestamp(inv.created_at);
    const patientKey = inv.patient_id || '';

    // Check against already-kept invoices for a near-duplicate
    let isDuplicate = false;
    for (const existing of kept) {
      if (
        existing.patient_id === patientKey &&
        toNumber(existing.amount) === amt
      ) {
        const existingTs = toTimestamp(existing.created_at);
        if (ts !== null && existingTs !== null && Math.abs(ts - existingTs) <= DUPLICATE_WINDOW_MS) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      kept.push(inv);
    }
  }

  return kept;
};
