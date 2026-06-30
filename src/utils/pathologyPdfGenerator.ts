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

const ML = 12;
const MR = 12;
const MT = 12;
const MB = 12;
const CW = 210 - ML - MR;
const FOOTER_H = 10;

const COL_PCT: [number, number, number, number, number] = [35, 18, 15, 22, 10];
let colX: number[] = [];
let colW: number[] = [];

const initCols = () => {
  colX = [];
  colW = [];
  let acc = ML;
  const pcts = COL_PCT;
  for (let i = 0; i < pcts.length; i++) {
    const w = Math.round((CW * pcts[i]) / 100);
    colX.push(acc);
    colW.push(w);
    acc += w;
  }
};

const accentBlue: [number, number, number] = [0, 0, 0];
const borderColor: [number, number, number] = [217, 222, 229];
const textMuted: [number, number, number] = [107, 114, 128];
const headerBg: [number, number, number] = [248, 250, 252];
const sectionBg: [number, number, number] = [242, 244, 247];

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
  initCols();
  const pdfFileName = `${data.patientId || 'Unknown'} - ${data.patientName || 'Patient'} - Lab Report.pdf`;
  const useGrayscale = opts.grayscale !== false;

  const priorParamIds: string[] = [];
  for (const tt of data.testTypes) {
    for (const p of tt.parameters) if (p.parameter_id) priorParamIds.push(p.parameter_id);
  }

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

  let prevHeaderDate = '';
  {
    let newestPrev = '';
    previousByParam.forEach((arr) => { const d = arr[0]?.date; if (d && d > newestPrev) newestPrev = d; });
    try { if (newestPrev) prevHeaderDate = formatInPakistanTime(newestPrev, 'dd/MM/yyyy'); } catch { /* ignore */ }
  }

  let qrDataUrl = '';
  let verifyUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://southwesthospitalkohat.com';
    verifyUrl = `${origin}/verify-report/${data.reportNumber}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });
  } catch { /* best-effort */ }

  const logoDataUrl = hospital?.logo_url ? await loadImageDataUrl(hospital.logo_url) : await loadImageDataUrl('/logo.png');
  const verifyLogoDataUrl = await loadImageDataUrl('/verification.png');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const safeBottom = () => pageHeight - MB - FOOTER_H - 2;

  let y = MT;

  const drawPageHeader = () => {
    y = MT;

    // ── Logo + hospital name ──
    let titleX = ML;
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', ML, y, 14, 14); titleX = ML + 18; } catch { /* ignore */ }
    }

    const nameRightLimit = pageWidth - MR - 36;
    const nameMaxW = nameRightLimit - titleX;
    doc.setTextColor(...accentBlue);
    doc.setFont('helvetica', 'bold');
    const hname = (hospital?.hospital_name || 'Hospital').toUpperCase();
    let size = 15;
    doc.setFontSize(size);
    while (doc.getTextWidth(hname) > nameMaxW && size > 9) { size--; doc.setFontSize(size); }
    doc.text(hname, titleX, y + 5);

    // Address / contact
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const addrParts = [hospital?.hospital_address, hospital?.contact_number, hospital?.email].filter(Boolean);
    if (addrParts.length) {
      const addrStr = addrParts.join('  |  ');
      doc.text(doc.splitTextToSize(addrStr, nameMaxW)[0], titleX, y + 10);
    }
    if (data.reportNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentBlue);
      doc.setFontSize(7.5);
      doc.text(`Report #: ${data.reportNumber}`, titleX, y + 15);
    }

    // QR code (right)
    if (qrDataUrl) {
      const qx = pageWidth - MR - 17;
      const qy = y;
      if (verifyLogoDataUrl) {
        try { doc.addImage(verifyLogoDataUrl, 'PNG', qx - 1.5 - 15, qy - 1, 15, 18); } catch { /* ignore */ }
      }
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qx - 1, qy - 1, 18, 20, 1, 1, 'F');
      try { doc.addImage(qrDataUrl, 'PNG', qx, qy, 16, 16); } catch { /* ignore */ }
      doc.setTextColor(...accentBlue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.2);
      doc.text('SCAN TO VERIFY', qx + 8, qy + 18.5, { align: 'center' });
    }

    y += 20;

    // ── Divider ──
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(ML, y, pageWidth - MR, y);
    y += 4;

    // ── Patient info strip ──
    const leftLabelX = ML;
    const leftValueX = ML + 28;
    const rightLabelX = ML + Math.floor(CW / 2);
    const rightValueX = rightLabelX + 28;
    const pRowH = 7;

    const patientRows = [
      { lLabel: 'Patient Name', lValue: data.patientName || '—', rLabel: 'Patient ID', rValue: data.patientId || '—' },
      { lLabel: 'Age / Sex', lValue: `${data.patientAge ?? '—'} / ${data.patientSex || '—'}`, rLabel: 'Ref By', rValue: data.referredBy || '—' },
      { lLabel: 'Collected', lValue: fmtShort(data.collectedAt) || '—', rLabel: 'Reported', rValue: fmtShort(data.reportedAt) || '—' },
    ];

    patientRows.forEach((row, i) => {
      const ry = y + i * pRowH;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(row.lLabel, leftLabelX, ry + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(row.lValue, rightLabelX - leftValueX - 4)[0], leftValueX, ry + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(row.rLabel, rightLabelX, ry + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(row.rValue, pageWidth - MR - rightValueX - 2)[0], rightValueX, ry + 3.5);
    });

    y += patientRows.length * pRowH + 3;

    // ── Bottom divider ──
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(ML, y, pageWidth - MR, y);
    y += 4;
  };

  const drawPageFooter = () => {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(ML, pageHeight - MB - FOOTER_H + 1, pageWidth - MR, pageHeight - MB - FOOTER_H + 1);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const left = data.status === 'final' ? 'FINAL REPORT' : 'DRAFT';
    doc.text(left, ML, pageHeight - MB - FOOTER_H + 5);
    doc.text(hospital?.hospital_name || 'Hospital', pageWidth / 2, pageHeight - MB - FOOTER_H + 5, { align: 'center' });
  };

  const newPage = (): number => {
    drawPageFooter();
    doc.addPage();
    drawPageHeader();
    return y;
  };

  // ── Five-column table header ──
  const HEADER_H = 7;
  const drawTableHeader = () => {
    // Background
    doc.setFillColor(...(useGrayscale ? [245, 245, 245] as [number, number, number] : headerBg));
    doc.rect(ML, y, CW, HEADER_H, 'F');
    // Borders
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(ML, y, pageWidth - MR, y);
    doc.line(ML, y + HEADER_H, pageWidth - MR, y + HEADER_H);
    for (let i = 0; i < 5; i++) {
      doc.line(colX[i], y, colX[i], y + HEADER_H);
    }

    doc.setTextColor(...accentBlue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const labels = ['INVESTIGATION', 'RESULT', 'PREVIOUS', 'REFERENCE', 'UNIT'];
    const ty = y + 4.5;
    labels.forEach((l, i) => {
      doc.text(l, colX[i] + 2, ty);
    });

    // Previous date sub-label
    if (prevHeaderDate) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      const prevX = colX[2] + 2 + doc.getTextWidth('PREVIOUS') + 1;
      const prevW = colW[2] - 4 - doc.getTextWidth('PREVIOUS') - 1;
      if (prevW > 12) {
        const dateLabel = `(${prevHeaderDate})`;
        let ds = 5.5;
        doc.setFontSize(ds);
        while (doc.getTextWidth(dateLabel) > prevW && ds > 4) { ds -= 0.2; doc.setFontSize(ds); }
        if (doc.getTextWidth(dateLabel) <= prevW) doc.text(dateLabel, prevX, ty);
      }
    }

    doc.setTextColor(0, 0, 0);
    y += HEADER_H;
  };

  // ── Badge ──
  const drawBadge = (x: number, baselineY: number, flag: 'High' | 'Low' | 'Borderline') => {
    const pillBg: [number, number, number] = [229, 231, 235];
    const pillText: [number, number, number] = [17, 24, 39];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    const w = doc.getTextWidth(flag) + 4;
    doc.setFillColor(...pillBg);
    doc.roundedRect(x, baselineY - 2.8, w, 4.2, 2.1, 2.1, 'F');
    doc.setTextColor(...pillText);
    doc.text(flag, x + 2, baselineY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    return w;
  };

  // ── Draw a single parameter row ──
  const ROW_MIN_H = 6;
  const rowHeightForParam = (p: PathologyPdfParameter): number => {
    doc.setFontSize(7.5);
    const invW = colW[0] - 4;
    const refW = colW[3] - 4;
    const invLines = doc.splitTextToSize(p.parameter_name, invW).length;
    const refStr = refTextOf(p);
    const refLines = doc.splitTextToSize(refStr, refW).length;
    let h = Math.max(invLines, refLines, 1) * 4.5 + 1;
    if (h < ROW_MIN_H) h = ROW_MIN_H;

    return h;
  };

  const refTextOf = (p: PathologyPdfParameter) => {
    const ownRange = p.ref_min != null || p.ref_max != null;
    if (p.display_all_subranges && p.subranges && p.subranges.length > 0 && !ownRange) {
      return p.ref_display || '(See Below)';
    }
    return p.subrange_used ? `${p.subrange_used}: ${p.ref_display || '—'}` : (p.ref_display || '—');
  };

  // ── Draw the table rows ──
  const drawRows = (tt: PathologyPdfTestType) => {
    let lastHeading: string | null = null;
    let rowIdx = 0;

    for (const p of tt.parameters) {
      const headingH = (p.category_heading && p.category_heading !== lastHeading) ? 6 : 0;
      const rH = rowHeightForParam(p);
      const needed = headingH + rH + 1;

      if (y + needed > safeBottom()) {
        closeTableSegment(y);
        y = newPage();
        drawTableHeader();
        lastHeading = null;
      }

      // ── Section heading ──
      if (p.category_heading && p.category_heading !== lastHeading) {
        doc.setFillColor(...(useGrayscale ? [235, 235, 235] as [number, number, number] : sectionBg));
        doc.rect(ML, y, CW, 6, 'F');
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.line(ML, y, pageWidth - MR, y);
        doc.line(ML, y + 6, pageWidth - MR, y + 6);
        doc.setTextColor(...accentBlue);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(p.category_heading.toUpperCase(), ML + 4, y + 4);
        doc.setTextColor(0, 0, 0);
        y += 6;
        lastHeading = p.category_heading;
      }

      // ── Alternating row bg ──
      if (rowIdx % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(ML, y, CW, rH, 'F');
      }

      // ── INVESTIGATION ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const invW = colW[0] - 4;
      const invLines = doc.splitTextToSize(p.parameter_name, invW);
      doc.text(invLines, colX[0] + 2, y + 4);

      // ── RESULT ──
      const flag = p.flag;
      const resultText = p.result_value ?? '—';
      if (flag) {
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.setFont('helvetica', flag ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      let rx = colX[1] + 2;
      doc.text(resultText, rx, y + 4);
      if (flag) {
        const valW = doc.getTextWidth(resultText);
        drawBadge(rx + valW + 2, y + 4, flag);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // ── PREVIOUS ──
      const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
      const latest = prev?.[0];
      doc.setFontSize(7.5);
      if (latest) {
        doc.setTextColor(0, 0, 0);
        doc.text(latest.value, colX[2] + 2, y + 4);
      } else {
        doc.setTextColor(0, 0, 0);
        doc.text('—', colX[2] + 2, y + 4);
      }
      doc.setTextColor(0, 0, 0);

      // ── REFERENCE ──
      const refW = colW[3] - 4;
      const refStr = refTextOf(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const refLines = doc.splitTextToSize(refStr, refW);
      doc.text(refLines, colX[3] + 2, y + 4);
      doc.setTextColor(0, 0, 0);

      // ── UNIT ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(p.unit || '—', colX[4] + 2, y + 4);

      y += rH;

      // ── Sub-range display ──
      if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
        const hasOwnRange = p.ref_min != null || p.ref_max != null;

        if (hasOwnRange) {
          y += 1;
          for (const sr of p.subranges) {
            const sH = 3.8;
            if (y + sH > safeBottom()) {
              closeTableSegment(y);
              y = newPage();
              drawTableHeader();
            }
            if (rowIdx % 2 === 1) {
              doc.setFillColor(252, 252, 252);
              doc.rect(ML, y, CW, sH, 'F');
            }
            // Sub-range label + ref combined in REFERENCE col only
            const srRef = sr.ref_display || (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} – ${sr.ref_max}` : '—');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(0, 0, 0);
            doc.text(`${sr.label || '—'}  ${srRef}`, colX[3] + 2, y + 3);
            doc.setTextColor(0, 0, 0);
            y += sH;
          }
          y += 1;
        } else {
          y += 1;
          for (const sr of p.subranges) {
            const sH = 4;
            if (y + sH > safeBottom()) {
              closeTableSegment(y);
              y = newPage();
              drawTableHeader();
            }

            const srRef = sr.ref_display || (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} – ${sr.ref_max}` : '—');
            const isSelected = (p.subrange_id && sr.id === p.subrange_id) || (!p.subrange_id && !!p.subrange_used && sr.label === p.subrange_used);

            if (isSelected) {
              doc.setFillColor(254, 243, 199);
              doc.rect(ML, y, CW, sH, 'F');
            }

            doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(0, 0, 0);
            doc.text(`${sr.label || '—'}  ${srRef}`, colX[3] + 2, y + 3);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            y += sH;
          }
          y += 2;
        }
      }

      rowIdx++;
    }
  };

  const closeTableSegment = (bottomY: number) => {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(ML, y, pageWidth - MR, y);
  };

  // ── RENDER ──
  drawPageHeader();

  for (const tt of data.testTypes) {
    // Estimate remaining space
    let estH = 0;
    let lastCat: string | null = null;
    for (const p of tt.parameters) {
      if (p.category_heading && p.category_heading !== lastCat) { estH += 6; lastCat = p.category_heading; }
      estH += rowHeightForParam(p);
    }
    estH += HEADER_H + 4;

    const usable = safeBottom() - MT - 10;
    const remaining = safeBottom() - y;
    if ((estH <= usable && remaining < estH) || remaining < 40) y = newPage();

    // ── Test title ──
    {
      const testName = tt.name.toUpperCase();
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.line(ML, y, pageWidth - MR, y);
      y += 3;
      doc.setTextColor(...accentBlue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(testName, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 2;
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.line(ML, y, pageWidth - MR, y);
      y += 4;
    }

    if (tt.report_category) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(tt.report_category, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 4;
    }

    if (data.sampleType) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Sample Type:', ML, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.sampleType, ML + 22, y);
      y += 4;
    }

    drawTableHeader();

    drawRows(tt);

    y += 2;
    closeTableSegment(y);
    y += 3;

    // ── Method / Instrument ──
    if (tt.method || data.instrument) {
      if (y > safeBottom() - 6) y = newPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const segs: string[] = [];
      if (data.instrument) segs.push(`Instrument: ${data.instrument}`);
      if (tt.method) segs.push(`Method: ${tt.method}`);
      doc.text(segs.join('  |  '), ML, y);
      y += 5;
    }

    if (tt.notes) {
      if (y > safeBottom() - 8) y = newPage();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const noteLines = doc.splitTextToSize(tt.notes, CW);
      doc.text(noteLines, ML, y);
      y += noteLines.length * 3.5;
    }
    y += 3;
  }

  // ── Interpretation ──
  if (data.interpretation) {
    if (y > safeBottom() - 15) y = newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Interpretation:', ML, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.interpretation, CW - 25);
    doc.text(lines, ML + 25, y);
    y += lines.length * 4 + 2;
  }

  // ── End of report ──
  if (y > safeBottom() - 10) y = newPage();
  y += 4;
  doc.setTextColor(...accentBlue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('**** End of Report ****', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  drawPageFooter();

  // ── Page numbers (post-process all pages) ──
  const totalPgs = (doc as any).internal.getNumberOfPages() as number;
  for (let i = 1; i <= totalPgs; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(ML, pageHeight - MB - FOOTER_H + 1, pageWidth - MR, pageHeight - MB - FOOTER_H + 1);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const left = data.status === 'final' ? 'FINAL REPORT' : 'DRAFT';
    doc.text(left, ML, pageHeight - MB - FOOTER_H + 5);
    doc.text(hospital?.hospital_name || 'Hospital', pageWidth / 2, pageHeight - MB - FOOTER_H + 5, { align: 'center' });
    doc.text(`Page ${i} of ${totalPgs}`, pageWidth - MR, pageHeight - MB - FOOTER_H + 5, { align: 'right' });
  }

  // ── Output ──
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
