import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { formatInPakistanTime } from './timezone';

// ── Shared row/summary shapes (used by the page, CSV export and this PDF) ──────
export interface LabRegisterRow {
  serial: number;
  reportNumber: string;
  date: string;          // ISO timestamp
  patientId: string;
  patientName: string;
  referredBy: string;
  tests: string[];
  charges: number;
}

export interface LabRegisterSummary {
  totalReports: number;
  totalCharges: number;
  topTest: string;       // e.g. "CBC (12)" or "—"
}

// ── Brand palette (matches the lab report PDF) ────────────────────────────────
const BRAND: [number, number, number] = [15, 76, 129];
const HEAD_BG: [number, number, number] = [225, 234, 244];
const ZEBRA: [number, number, number] = [244, 247, 251];

// Cache hospital settings for the session (5 min TTL).
let cachedHospital: any;
let cachedHospitalAt = 0;
const fetchHospital = async () => {
  if (cachedHospital !== undefined && Date.now() - cachedHospitalAt < 5 * 60 * 1000) return cachedHospital;
  try {
    const { data } = await supabase.from('hospital_settings').select('*').limit(1).single();
    cachedHospital = data; cachedHospitalAt = Date.now();
    return data;
  } catch {
    return null;
  }
};

const logoCache = new Map<string, string | null>();
const loadImageDataUrl = async (url: string): Promise<string | null> => {
  if (logoCache.has(url)) return logoCache.get(url) ?? null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    logoCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    logoCache.set(url, null);
    return null;
  }
};

const fmtNum = (n: number) => Math.round(Number(n) || 0).toLocaleString('en-PK');
const fmtDate = (iso: string) => {
  try { return formatInPakistanTime(iso, 'dd/MM/yyyy'); } catch { return '—'; }
};

// ── Column layout (landscape A4: 297 × 210, 10mm margins → 277mm content) ──────
const marginX = 10;
const COLS = [
  { key: 'serial',  label: 'S/N',         x: 10,  w: 12, align: 'center' as const },
  { key: 'date',    label: 'Date',        x: 22,  w: 22, align: 'left'   as const },
  { key: 'report',  label: 'Report #',    x: 44,  w: 26, align: 'left'   as const },
  { key: 'pid',     label: 'Patient ID',  x: 70,  w: 20, align: 'left'   as const },
  { key: 'patient', label: 'Patient',     x: 90,  w: 48, align: 'left'   as const },
  { key: 'ref',     label: 'Referred By', x: 138, w: 40, align: 'left'   as const },
  { key: 'tests',   label: 'Tests',       x: 178, w: 83, align: 'left'   as const },
  { key: 'charges', label: 'Charges',     x: 261, w: 26, align: 'right'  as const },
];

export async function generateLabRegisterPDF(opts: {
  rows: LabRegisterRow[];
  summary: LabRegisterSummary;
  periodLabel: string;
  download?: boolean;   // when true, Save-As instead of opening the print dialog
}): Promise<void> {
  const { rows, summary, periodLabel } = opts;

  const hospital = await fetchHospital();
  const logoDataUrl = hospital?.logo_url ? await loadImageDataUrl(hospital.logo_url) : null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const footerLimit = pageHeight - 12;

  const lineH = 3.6;
  const cellPad = 1.5;

  // ── Brand band (every page) ─────────────────────────────────────────────────
  const drawBand = () => {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageWidth, 22, 'F');
    let titleX = marginX;
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', marginX, 3.5, 15, 15); titleX = marginX + 18; } catch { /* ignore */ }
    }
    const maxW = pageWidth - marginX - titleX;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const name = (hospital?.hospital_name || 'Hospital').toUpperCase();
    let s = 15; doc.setFontSize(s);
    while (doc.getTextWidth(name) > maxW && s > 9) { s--; doc.setFontSize(s); }
    doc.text(name, titleX, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setCharSpace(1.2);
    doc.setTextColor(208, 222, 236);
    doc.text('ACCURATE   ·   CARING   ·   INSTANT', titleX, 13.6);
    doc.setCharSpace(0);
    doc.setFontSize(7.4);
    doc.setTextColor(216, 228, 240);
    const addr = [hospital?.hospital_address, hospital?.contact_number].filter(Boolean).join('   ·   ');
    if (addr) doc.text(doc.splitTextToSize(addr, maxW)[0], titleX, 18);
  };

  // ── Title + period + summary (first page only) ──────────────────────────────
  const drawTitleBlock = () => {
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LABORATORY REPORTS REGISTER', marginX, 31);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd/MM/yyyy hh:mm a')}`, pageWidth - marginX, 31, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Period:', marginX, 37.5);
    doc.setFont('helvetica', 'normal');
    doc.text(periodLabel, marginX + 14, 37.5);

    const boxY = 40.5, boxH = 9;
    doc.setFillColor(...HEAD_BG);
    doc.roundedRect(marginX, boxY, contentWidth, boxH, 1.5, 1.5, 'F');
    let cx = marginX + 4;
    const cy = boxY + 5.9;
    const chip = (label: string, val: string) => {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 90, 90); doc.setFontSize(8.5);
      doc.text(label, cx, cy); cx += doc.getTextWidth(label) + 1.5;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND);
      doc.text(val, cx, cy); cx += doc.getTextWidth(val) + 12;
    };
    chip('Total Reports:', String(summary.totalReports));
    chip('Total Charges:', `Rs. ${fmtNum(summary.totalCharges)}`);
    chip('Top Test:', summary.topTest || '—');
    return boxY + boxH + 4;
  };

  // ── Table header (every page) ───────────────────────────────────────────────
  const drawTableHeader = (y: number) => {
    doc.setFillColor(...BRAND);
    doc.rect(marginX, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    for (const c of COLS) {
      const tx = c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x + 1.5;
      doc.text(c.label, tx, y + 4.7, { align: c.align });
    }
    return y + 7;
  };

  let pageNo = 1;
  drawBand();
  let y = drawTitleBlock();
  y = drawTableHeader(y);

  if (rows.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No reports found for the selected period.', pageWidth / 2, y + 12, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);

  rows.forEach((r, i) => {
    const testsLines = doc.splitTextToSize(r.tests.join(', ') || '—', COLS[6].w - 3);
    const patientLines = doc.splitTextToSize(r.patientName || '—', COLS[4].w - 3);
    const refLines = doc.splitTextToSize(r.referredBy || '—', COLS[5].w - 3);
    const nLines = Math.max(testsLines.length, patientLines.length, refLines.length, 1);
    const rowH = nLines * lineH + cellPad * 2;

    if (y + rowH > footerLimit) {
      doc.addPage();
      pageNo++;
      drawBand();
      y = 26;
      y = drawTableHeader(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
    }

    if (i % 2 === 1) {
      doc.setFillColor(...ZEBRA);
      doc.rect(marginX, y, contentWidth, rowH, 'F');
    }

    const baseY = y + cellPad + lineH - 0.7;
    const put = (key: string, value: string | string[]) => {
      const c = COLS.find((cc) => cc.key === key)!;
      const tx = c.align === 'right' ? c.x + c.w - 1 : c.align === 'center' ? c.x + c.w / 2 : c.x + 1.5;
      const lines = Array.isArray(value) ? value : [value];
      lines.forEach((ln, li) => doc.text(String(ln), tx, baseY + li * lineH, { align: c.align }));
    };

    put('serial', String(r.serial));
    put('date', fmtDate(r.date));
    put('report', r.reportNumber || '—');
    put('pid', r.patientId || '—');
    put('patient', patientLines);
    put('ref', refLines);
    put('tests', testsLines);
    put('charges', fmtNum(r.charges));

    // light row separator
    doc.setDrawColor(225, 228, 233);
    doc.setLineWidth(0.1);
    doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);

    y += rowH;
  });

  // ── Total row ───────────────────────────────────────────────────────────────
  if (rows.length > 0) {
    if (y + 9 > footerLimit) {
      doc.addPage(); pageNo++; drawBand(); y = 26; y = drawTableHeader(y);
    }
    doc.setFillColor(...HEAD_BG);
    doc.rect(marginX, y, contentWidth, 8, 'F');
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`TOTAL — ${summary.totalReports} report(s)`, COLS[4].x + 1.5, y + 5.2);
    doc.text(`Rs. ${fmtNum(summary.totalCharges)}`, COLS[7].x + COLS[7].w - 1, y + 5.2, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(120, 120, 120);
    doc.text('Charges are estimated from the current test catalog prices.', marginX, y + 4);
  }

  // ── Page numbers ────────────────────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${p} of ${total}`, pageWidth - marginX, pageHeight - 5, { align: 'right' });
  }

  const safeLabel = periodLabel.replace(/[^\w-]+/g, '_').slice(0, 40);

  // Default behaviour: open the browser print dialog (print preview) rather than
  // downloading the file. Pass { download: true } to force a Save-As instead.
  if (opts.download) {
    doc.save(`lab-register-${safeLabel}.pdf`);
    return;
  }

  try {
    try { doc.autoPrint(); } catch { /* ignore */ }
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;';
    iframe.src = url;
    iframe.onload = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* OpenAction fallback */ }
    };
    document.body.appendChild(iframe);
  } catch {
    // Fallback: open in a new tab, or download if pop-ups are blocked.
    try {
      const w = window.open(doc.output('bloburl') as unknown as string, '_blank');
      if (!w) doc.save(`lab-register-${safeLabel}.pdf`);
    } catch {
      doc.save(`lab-register-${safeLabel}.pdf`);
    }
  }
}
