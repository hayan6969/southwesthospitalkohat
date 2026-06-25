import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { formatInPakistanTime } from './timezone';

export interface PathologyPdfSubrange {
  id: string;
  label: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_display: string | null;
}

export interface PathologyPdfParameter {
  category_heading: string | null;
  parameter_name: string;
  unit: string | null;
  ref_display: string | null;
  ref_min?: number | null;
  ref_max?: number | null;
  result_value: string | null;
  flag: 'Low' | 'High' | 'Borderline' | null;
  subrange_used?: string | null;
  subrange_id?: string | null;
  display_all_subranges?: boolean;
  subranges?: PathologyPdfSubrange[];
  parameter_id?: string | null;
}

export interface PathologyPdfTestType {
  name: string;
  report_category: string | null;
  method: string | null;
  notes: string | null;
  parameters: PathologyPdfParameter[];
}

export interface PathologyPdfData {
  reportNumber: string;
  patientName: string;
  patientId: string;
  patientDbId?: string | null;
  currentReportId?: string | null;
  patientAge: number | string | null;
  patientSex: string | null;
  phone: string | null;
  referredBy: string | null;
  collectionAddress: string | null;
  sampleType: string | null;
  instrument: string | null;
  registeredAt: string | null;
  collectedAt: string | null;
  reportedAt: string | null;
  interpretation: string | null;
  status: 'draft' | 'final';
  testTypes: PathologyPdfTestType[];
}

// ── Brand palette ─────────────────────────────────────────────────────────────
const BRAND: [number, number, number] = [15, 76, 129];
const BRAND_STRIP: [number, number, number] = [33, 102, 158];   // lighter band for the patient strip
const FLAG_STYLE: Record<'High' | 'Low' | 'Borderline', {
  text: [number, number, number]; pillText: [number, number, number]; pillBg: [number, number, number];
}> = {
  High:       { text: [200, 30, 30],  pillText: [180, 35, 24], pillBg: [253, 236, 234] },
  Low:        { text: [30, 64, 175],  pillText: [29, 78, 216], pillBg: [234, 240, 255] },
  Borderline: { text: [200, 120, 30], pillText: [146, 96, 10], pillBg: [253, 243, 224] },
};

// Cache hospital settings for the session (5 min TTL) so every print doesn't re-query.
let cachedHospital: any;
let cachedHospitalAt = 0;
const fetchHospital = async () => {
  if (cachedHospital !== undefined && Date.now() - cachedHospitalAt < 5 * 60 * 1000) return cachedHospital;
  try {
    const { data } = await supabase.from('hospital_settings').select('*').limit(1).maybeSingle();
    cachedHospital = data; cachedHospitalAt = Date.now();
    return data;
  } catch {
    return null;
  }
};

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try { return formatInPakistanTime(iso, 'dd MMM yyyy, hh:mm a'); } catch { return iso; }
};
const fmtShort = (iso: string | null | undefined) => {
  if (!iso) return '';
  try { return formatInPakistanTime(iso, 'dd MMM yy'); } catch { return ''; }
};

// Cache the encoded logo per URL — fetch + base64 encode is the most expensive repeated step.
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

export async function generatePathologyReportPDF(
  data: PathologyPdfData,
  opts: { autoPrint?: boolean; grayscale?: boolean } = {}
) {
  const pdfFileName = `${data.patientId || 'Unknown'} - ${data.patientName || 'Patient'} - Lab Report.pdf`;
  const useGrayscale = opts.grayscale !== false;
  const brandCol: [number, number, number] = useGrayscale ? [255, 255, 255] : BRAND;
  const brandStripCol: [number, number, number] = useGrayscale ? [255, 255, 255] : BRAND_STRIP;
  const brandTextCol: [number, number, number] = useGrayscale ? [0, 0, 0] : [255, 255, 255];
  const stripTextCol: [number, number, number] = useGrayscale ? [0, 0, 0] : [255, 255, 255];
  const accentTextCol: [number, number, number] = useGrayscale ? [40, 40, 40] : BRAND;
  // Collect parameter ids up-front so the previous-results lookup runs in parallel with hospital.
  const priorParamIds: string[] = [];
  for (const tt of data.testTypes) {
    for (const p of tt.parameters) if (p.parameter_id) priorParamIds.push(p.parameter_id);
  }

  // ── Fetch hospital settings + previous results in parallel (best-effort) ────
  const previousByParam = new Map<string, Array<{ value: string; date: string }>>();
  const [hospital, priorRows] = await Promise.all([
    fetchHospital(),
    (data.patientDbId && priorParamIds.length > 0)
      ? supabase
          .from('lab_pathology_report_results')
          .select('parameter_id, result_value, report_id, lab_pathology_reports!inner(patient_id, reported_at, created_at, id)')
          .in('parameter_id', priorParamIds)
          .eq('lab_pathology_reports.patient_id', data.patientDbId)
          .then((res) => res.data ?? [], () => [])
      : Promise.resolve([] as any[]),
  ]);

  try {
    if (priorRows && priorRows.length > 0) {
      const grouped = new Map<string, Array<{ value: string; date: string }>>();
      for (const row of priorRows as any[]) {
        if (data.currentReportId && row.report_id === data.currentReportId) continue;
        if (!row.result_value) continue;
        const rep = row.lab_pathology_reports;
        const date = rep?.reported_at || rep?.created_at || '';
        const arr = grouped.get(row.parameter_id) ?? [];
        arr.push({ value: String(row.result_value), date });
        grouped.set(row.parameter_id, arr);
      }
      grouped.forEach((arr, k) => {
        arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        previousByParam.set(k, arr.slice(0, 3));
      });
    }
  } catch { /* best-effort */ }

  // Most recent previous date — shown once in the PREVIOUS column header
  let prevHeaderDate = '';
  {
    let newestPrev = '';
    previousByParam.forEach((arr) => { const d = arr[0]?.date; if (d && d > newestPrev) newestPrev = d; });
    try { if (newestPrev) prevHeaderDate = formatInPakistanTime(newestPrev, 'dd/MM/yyyy'); } catch { /* ignore */ }
  }

  // ── QR (generate once, up front — header drawer is synchronous) ─────────────
  let qrDataUrl = '';
  let verifyUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://southwesthospitalkohat.com';
    verifyUrl = `${origin}/verify-report/${data.reportNumber}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });
  } catch { /* best-effort */ }

  const logoDataUrl = hospital?.logo_url ? await loadImageDataUrl(hospital.logo_url) : await loadImageDataUrl('/logo.png');
  const verifyLogoDataUrl = await loadImageDataUrl('/verification.png');

  // ── PDF setup ───────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_H = 8;
  const FOOTER_RESERVE = FOOTER_H + 12;
  const safeBottom = () => pageHeight - FOOTER_RESERVE;

  // ── Column layout (5 columns) ───────────────────────────────────────────────
  const cellPad = 3;
  const COL_NAME_START = marginX + cellPad;   // 13  Investigation
  const COL_RESULT     = marginX + 60;        // 70  Result (+ flag pill)
  const COL_PREV       = marginX + 90;        // 100 Previous
  const COL_REF        = marginX + 126;       // 136 Reference (wider PREVIOUS to fit the (dd/mm/yyyy) label)
  const COL_UNIT       = marginX + 165;       // 175 Unit
  const COL_RESULT_DIV = COL_RESULT - cellPad;
  const COL_PREV_DIV   = COL_PREV   - cellPad;
  const COL_REF_DIV    = COL_REF    - cellPad;
  const COL_UNIT_DIV   = COL_UNIT   - cellPad;
  const NAME_W = COL_RESULT - cellPad - COL_NAME_START;
  const REF_W  = COL_UNIT   - cellPad - COL_REF;
  const headerHeight = 7;

  let y = 36;
  let segHeaderTop = y;

  // ── Repeating header (every page) ──────────────────────────────────────────
  const drawPageHeader = () => {
    // Main brand band
    doc.setFillColor(...brandCol);
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Verification logo (left of QR) + QR top-right with a white backing so it scans
    if (qrDataUrl) {
      const qx = pageWidth - marginX - 16;
      const qy = 3;
      if (verifyLogoDataUrl) {
        try { doc.addImage(verifyLogoDataUrl, 'PNG', qx - 1.5 - 18, qy - 1.5, 18, 22); } catch { /* ignore */ }
      }
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qx - 1.5, qy - 1.5, 19, 22, 1, 1, 'F');
      try { doc.addImage(qrDataUrl, 'PNG', qx, qy, 16, 16); } catch { /* ignore */ }
      doc.setTextColor(...accentTextCol);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.6);
      doc.text('SCAN TO VERIFY', qx + 8, qy + 18.5, { align: 'center' });
    }

    // Optional logo at the far left; title flows to its right
    let titleX = marginX;
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', marginX, 4, 15, 15); titleX = marginX + 18; } catch { /* ignore */ }
    }

    // Hospital name — left-aligned, auto-shrunk to leave room for the QR
    const nameRightLimit = pageWidth - marginX - 40;   // keep clear of the QR + verification logo
    const nameMaxW = nameRightLimit - titleX;
    doc.setTextColor(...brandTextCol);
    doc.setFont('helvetica', 'bold');
    const name = (hospital?.hospital_name || 'Hospital').toUpperCase();
    let size = 16;
    doc.setFontSize(size);
    while (doc.getTextWidth(name) > nameMaxW && size > 9) { size--; doc.setFontSize(size); }
    doc.text(name, titleX, 9.5);

    // Tagline — letter-spaced
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setCharSpace(1.3);
      doc.setTextColor(...(useGrayscale ? [180, 180, 180] as [number, number, number] : [208, 222, 236]));
    doc.text('ACCURATE   ·   CARING   ·   INSTANT', titleX, 14.6);
    doc.setCharSpace(0);

    // Address · contact — inside the band, left-aligned
    doc.setFontSize(7.6);
    doc.setTextColor(...(useGrayscale ? [190, 190, 190] as [number, number, number] : [216, 228, 240]));
    const addr = [hospital?.hospital_address, hospital?.contact_number].filter(Boolean).join('   ·   ');
    if (addr) doc.text(doc.splitTextToSize(addr, nameMaxW)[0], titleX, 19.6);

    // Blue summary strip: patient · report · collected
    doc.setFillColor(...brandStripCol);
    doc.rect(0, 24, pageWidth, 7, 'F');
    doc.setTextColor(...stripTextCol);
    let sx = marginX;
    const sy = 28.7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const pname = data.patientName || '—';
    doc.text(pname, sx, sy);
    sx += doc.getTextWidth(pname) + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    const repSeg = `Report: ${data.reportNumber || '—'}`;
    doc.text(repSeg, sx, sy);
    sx += doc.getTextWidth(repSeg) + 7;
    const coll = fmtShort(data.collectedAt);
    if (coll) doc.text(`Collected ${coll}`, sx, sy);

    doc.setTextColor(0, 0, 0);
  };

  // ── Repeating footer (every page) ──────────────────────────────────────────
  const drawPageFooter = () => {
    doc.setFillColor(...brandCol);
    doc.rect(0, pageHeight - FOOTER_H, pageWidth, FOOTER_H, 'F');
    doc.setTextColor(...brandTextCol);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const left = `${data.status === 'final' ? 'FINAL REPORT' : 'DRAFT'}  ·  Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd-MMM-yyyy hh:mm a')}`;
    doc.text(left, marginX, pageHeight - 3);
    doc.text('Computer-generated report', pageWidth - marginX, pageHeight - 3, { align: 'right' });
  };

  const newPage = (): number => {
    drawPageFooter();
    doc.addPage();
    drawPageHeader();
    return 36;
  };

  // ── Shared column-header band ──────────────────────────────────────────────
  const drawColumnHeader = () => {
    segHeaderTop = y;
    doc.setFillColor(...brandCol);
    doc.rect(marginX, y, contentWidth, headerHeight, 'F');
    doc.setTextColor(...brandTextCol);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const ty = y + 5;
    doc.text('INVESTIGATION', COL_NAME_START, ty);
    doc.text('RESULT',        COL_RESULT,     ty);
    doc.text('PREVIOUS', COL_PREV, ty);
    if (prevHeaderDate) {
      const dateX = COL_PREV + doc.getTextWidth('PREVIOUS') + 1.5;  // pw measured at size 8
      const avail = COL_REF_DIV - 1 - dateX;                        // keep clear of the column divider
      const label = `(${prevHeaderDate})`;
      let ds = 7;
      doc.setFontSize(ds);
      while (doc.getTextWidth(label) > avail && ds > 4.6) { ds -= 0.2; doc.setFontSize(ds); }
      if (doc.getTextWidth(label) <= avail) doc.text(label, dateX, ty);
      doc.setFontSize(8);
    }
    doc.text('REFERENCE',     COL_REF,        ty);
    doc.text('UNIT',          COL_UNIT,       ty);
    doc.setTextColor(0, 0, 0);
    y += headerHeight + 5;
  };

  const closeTableSegment = (bottomY: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginX, segHeaderTop, marginX, bottomY);
    doc.line(pageWidth - marginX, segHeaderTop, pageWidth - marginX, bottomY);
    doc.line(marginX, segHeaderTop, pageWidth - marginX, segHeaderTop);
    doc.line(marginX, bottomY, pageWidth - marginX, bottomY);
    [COL_RESULT_DIV, COL_PREV_DIV, COL_REF_DIV, COL_UNIT_DIV].forEach((vx) => {
      doc.line(vx, segHeaderTop, vx, bottomY);
    });
  };

  // ── Flag pill (words only — Helvetica has no ▲▼◆ glyphs) ───────────────────
  const drawFlagChip = (x: number, baselineY: number, flag: 'High' | 'Low' | 'Borderline') => {
    if (useGrayscale) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      const w = doc.getTextWidth(flag) + 4;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(x, baselineY - 3.1, w, 4.4, 1.2, 1.2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(flag, x + 2, baselineY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      return w;
    }
    const st = FLAG_STYLE[flag];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const w = doc.getTextWidth(flag) + 4;
    doc.setFillColor(...st.pillBg);
    doc.roundedRect(x, baselineY - 3.1, w, 4.4, 1.2, 1.2, 'F');
    doc.setTextColor(...st.pillText);
    doc.text(flag, x + 2, baselineY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    return w;
  };

  // ── Height estimators (keep font sizes in lock-step with the renderer) ──────
  const refTextOf = (p: PathologyPdfParameter) => {
    const ownRange = p.ref_min != null || p.ref_max != null;
    return (p.display_all_subranges && !ownRange)
      ? (p.ref_display || '( See Below )')
      : (p.subrange_used ? `${p.subrange_used}: ${p.ref_display || '—'}` : (p.ref_display || '—'));
  };
  const rowAdvance = (p: PathologyPdfParameter): number => {
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(p.parameter_name, NAME_W).length;
    const refLines = doc.splitTextToSize(refTextOf(p), REF_W).length;
    return 5 * Math.max(nameLines, refLines, 1);
  };
  const measureParamHeight = (p: PathologyPdfParameter): number => {
    let h = rowAdvance(p);
    if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
      h += 6 + p.subranges.length * 4.6 + 4;
    }
    return h;
  };
  const measureTestHeight = (tt: PathologyPdfTestType): number => {
    let h = 5;
    if (tt.report_category) h += 4;
    if (data.sampleType) h += 4;
    h += headerHeight + 5;
    let lastH: string | null = null;
    for (const p of tt.parameters) {
      if (p.category_heading && p.category_heading !== lastH) { h += 5; lastH = p.category_heading; }
      h += measureParamHeight(p);
    }
    h += 2 + 1;
    if (tt.method || data.instrument) h += 5;
    if (tt.notes) {
      doc.setFontSize(8);
      h += doc.splitTextToSize(tt.notes, contentWidth).length * 3.5;
      doc.setFontSize(9);
    }
    return h + 4;
  };

  // ── Page 1 ──────────────────────────────────────────────────────────────────
  drawPageHeader();
  doc.setTextColor(0, 0, 0);
  y = 36;

  // ── Patient block (page 1 only) — compact bordered grid ─────────────────────
  const gridTop = y;
  const colW = contentWidth / 3;
  const rowH = 10.5;
  const gridH = rowH * 2;
  const ageSex = `${data.patientAge ?? '—'} Yrs  /  ${data.patientSex || '—'}`;
  const cells: Array<[string, string]> = [
    ['PATIENT NAME', data.patientName || '—'],
    ['AGE / SEX',    ageSex],
    ['PATIENT ID',   data.patientId || '—'],
    ['REFERRED BY',  data.referredBy || '—'],
    ['COLLECTED ON', fmt(data.collectedAt)],
    ['REPORTED ON',  fmt(data.reportedAt)],
  ];
  doc.setDrawColor(208, 215, 222);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, gridTop, contentWidth, gridH, 1.5, 1.5, 'S');
  doc.line(marginX + colW,     gridTop, marginX + colW,     gridTop + gridH);
  doc.line(marginX + colW * 2, gridTop, marginX + colW * 2, gridTop + gridH);
  doc.line(marginX, gridTop + rowH, pageWidth - marginX, gridTop + rowH);
  cells.forEach(([label, value], i) => {
    const cx = marginX + (i % 3) * colW + 3;
    const ry = gridTop + Math.floor(i / 3) * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(125, 134, 143);
    doc.text(label, cx, ry + 3.9);
    doc.setFontSize(9);
    doc.setTextColor(20, 28, 38);
    doc.text(doc.splitTextToSize(value, colW - 6)[0], cx, ry + 8.6);
  });
  doc.setTextColor(0, 0, 0);
  y = gridTop + gridH + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(110, 120, 130);
  const legend = doc.splitTextToSize(
    "High / Low / Borderline flagged in colour  ·  'Previous' shows the most recent prior result  ·  Each test stays whole — a panel that does not fit moves to the next page.",
    contentWidth
  );
  doc.text(legend, marginX, y);
  y += legend.length * 3.4 + 2;

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // ── Render each test ─────────────────────────────────────────────────────────
  for (const tt of data.testTypes) {
    const testH     = measureTestHeight(tt);
    const usable    = safeBottom() - 18;
    const remaining = safeBottom() - y;
    if ((testH <= usable && remaining < testH) || remaining < 40) y = newPage();

    // Test title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...accentTextCol);
    doc.text(tt.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 5;
    if (tt.report_category) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(tt.report_category, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 4;
    }
    if (data.sampleType) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Primary Sample Type :', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.sampleType, marginX + 38, y);
      y += 4;
    }

    drawColumnHeader();

    doc.setFont('helvetica', 'normal');
    let lastHeading: string | null = null;

    for (const p of tt.parameters) {
      const headingH = (p.category_heading && p.category_heading !== lastHeading) ? 5 : 0;
      const needed = headingH + measureParamHeight(p);
      if (y + needed > safeBottom()) {
        closeTableSegment(y);
        y = newPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...accentTextCol);
        doc.text(`${tt.name.toUpperCase()} (cont.)`, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 5;
        drawColumnHeader();
      }

      // Group heading band
      if (p.category_heading && p.category_heading !== lastHeading) {
        doc.setFillColor(238, 241, 245);
        doc.rect(marginX, y - 3.4, contentWidth, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(...accentTextCol);
        doc.text(p.category_heading.toUpperCase(), COL_NAME_START, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        lastHeading = p.category_heading;
      }

      // Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const nameLines = doc.splitTextToSize(p.parameter_name, NAME_W);
      doc.text(nameLines, COL_NAME_START, y);

      // Result + flag pill
      const flag = p.flag;
      const resultText = p.result_value ?? '—';
      if (flag) {
        if (useGrayscale) doc.setTextColor(0, 0, 0);
        else doc.setTextColor(...FLAG_STYLE[flag].text);
      } else doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', flag ? 'bold' : 'normal');
      doc.text(resultText, COL_RESULT, y);
      if (flag) {
        const valW = doc.getTextWidth(resultText);
        drawFlagChip(COL_RESULT + valW + 2, y, flag);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Previous (value only — the date is shown once in the column header)
      const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
      const latest = prev?.[0];
      if (latest) {
        doc.setTextColor(70, 70, 70);
        doc.text(latest.value, COL_PREV, y);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('—', COL_PREV, y);
        doc.setTextColor(0, 0, 0);
      }

      // Reference
      const refLines = doc.splitTextToSize(refTextOf(p), REF_W);
      doc.text(refLines, COL_REF, y);

      // Unit
      doc.text(p.unit || '—', COL_UNIT, y);

      y += 5 * Math.max(nameLines.length, refLines.length, 1);

      // ── Interpretation sub-scale ──────────────────────────────────────────
      if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
        const isReferenceScale = p.ref_min != null || p.ref_max != null;
        const parsed = p.subranges.map((sr) => {
          const raw = sr.ref_display || (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} - ${sr.ref_max}` : '');
          const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
          return {
            sr,
            value: sr.label || '—',
            reading: (m ? m[1] : raw).trim(),
            group: (m ? m[2] : '').trim(),
            selected: !isReferenceScale && (
              (p.subrange_id && sr.id === p.subrange_id) ||
              (!p.subrange_id && !!p.subrange_used && sr.label === p.subrange_used)
            ),
          };
        });
        const hasGroups = parsed.some((x) => x.group);
        const rowH = 4.6;
        const cValue = COL_NAME_START + 4;
        const cRead  = COL_RESULT;
        const cGroup = COL_REF;
        const groupBoxLeft = cGroup - 3;
        const groupRight = COL_UNIT_DIV - 1;

        const drawSubHeader = () => {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(110, 110, 110);
          doc.text('Value', cValue, y);
          doc.text(p.unit ? `Reading (${p.unit})` : 'Reading', cRead, y);
          if (hasGroups) doc.text('Interpretation', cGroup, y);
          doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.2);
          doc.line(marginX + 2, y + 1.4, groupRight, y + 1.4);
          y += 4.6;
          doc.setTextColor(0, 0, 0);
        };
        const drawGroupBox = (topY: number, grp: string) => {
          if (!hasGroups || !grp) return;
          const boxBottom = y - 3.3;
          doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2);
          doc.rect(groupBoxLeft, topY, groupRight - groupBoxLeft, boxBottom - topY);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(grp, groupRight - cGroup - 1);
          doc.text(lines, cGroup, topY + (boxBottom - topY) / 2 - (lines.length - 1) * 1.5 + 1.4);
        };

        drawSubHeader();
        let i = 0;
        while (i < parsed.length) {
          const grp = parsed[i].group;
          let segTop = y - 3.3;
          let k = i;
          while (k < parsed.length && parsed[k].group === grp) {
            if (y > safeBottom()) {
              drawGroupBox(segTop, grp);
              closeTableSegment(y);
              y = newPage();
              drawColumnHeader();
              drawSubHeader();
              segTop = y - 3.3;
            }
            const x = parsed[k];
            if (x.selected) {
              doc.setFillColor(255, 249, 196);
              doc.rect(marginX + 0.3, y - 3.3, contentWidth - 0.6, rowH, 'F');
            }
            doc.setFont('helvetica', x.selected ? 'bold' : 'normal');
            doc.setFontSize(8); doc.setTextColor(55, 55, 55);
            doc.text(x.value, cValue, y);
            if (x.reading) doc.text(x.reading, cRead, y);
            doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            y += rowH;
            k++;
          }
          drawGroupBox(segTop, grp);
          i = k;
          if (i < parsed.length) y += 1.6;
        }
        y += 2;
        doc.setLineWidth(0.3);
        doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      }
    } // params

    y += 2;
    closeTableSegment(y);
    y += 1;

    // Method / Instrument / Notes (outside the table)
    y += 2;
    if (tt.method || data.instrument) {
      if (y > safeBottom() - 6) y = newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const segs: string[] = [];
      if (data.instrument) segs.push(`Instruments: ${data.instrument}`);
      if (tt.method) segs.push(`Method: ${tt.method}`);
      doc.text(segs.join('   |   '), marginX, y);
      y += 5;
    }
    if (tt.notes) {
      if (y > safeBottom() - 8) y = newPage();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const noteLines = doc.splitTextToSize(tt.notes, contentWidth);
      doc.text(noteLines, marginX, y);
      y += noteLines.length * 3.5;
    }
    y += 4;
  } // testTypes

  // ── Interpretation ──────────────────────────────────────────────────────────
  if (data.interpretation) {
    if (y > safeBottom() - 15) y = newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Interpretation:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.interpretation, contentWidth - 25);
    doc.text(lines, marginX + 25, y);
    y += lines.length * 4 + 2;
  }

  // ── End of report ─────────────────────────────────────────────────────────────
  if (y > safeBottom() - 10) y = newPage();
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentTextCol);
  doc.text('****End of Report****', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Footer on the final page (QR lives in the header now, not here)
  drawPageFooter();

  // ── Output ────────────────────────────────────────────────────────────────────
  try {
    if (opts.autoPrint) {
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
    } else {
      const blobUrl = doc.output('bloburl');
      const w = window.open(blobUrl as unknown as string, '_blank');
      if (!w) doc.save(pdfFileName);
    }
  } catch {
    doc.save(pdfFileName);
  }
}
