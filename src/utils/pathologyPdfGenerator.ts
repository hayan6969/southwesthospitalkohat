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

const fetchHospital = async () => {
  try {
    const { data } = await supabase.from('hospital_settings').select('*').limit(1).single();
    return data;
  } catch {
    return null;
  }
};

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return formatInPakistanTime(iso, 'dd MMM yyyy, hh:mm a');
  } catch {
    return iso;
  }
};

const loadImageDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export async function generatePathologyReportPDF(data: PathologyPdfData) {
  const hospital = await fetchHospital();

  // ── Fetch previous results ────────────────────────────────────────────────
  const previousByParam = new Map<string, Array<{ value: string; date: string }>>();
  try {
    const paramIds: string[] = [];
    for (const tt of data.testTypes) {
      for (const p of tt.parameters) {
        if (p.parameter_id) paramIds.push(p.parameter_id);
      }
    }
    if (data.patientDbId && paramIds.length > 0) {
      const { data: priorRows } = await supabase
        .from('lab_pathology_report_results')
        .select('parameter_id, result_value, report_id, lab_pathology_reports!inner(patient_id, reported_at, created_at, id)')
        .in('parameter_id', paramIds)
        .eq('lab_pathology_reports.patient_id', data.patientDbId);

      const grouped = new Map<string, Array<{ value: string; date: string; rid: string }>>();
      for (const row of (priorRows ?? []) as any[]) {
        if (data.currentReportId && row.report_id === data.currentReportId) continue;
        if (!row.result_value) continue;
        const rep = row.lab_pathology_reports;
        const date = rep?.reported_at || rep?.created_at || '';
        const arr = grouped.get(row.parameter_id) ?? [];
        arr.push({ value: String(row.result_value), date, rid: row.report_id });
        grouped.set(row.parameter_id, arr);
      }
      grouped.forEach((arr, k) => {
        arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        previousByParam.set(k, arr.slice(0, 3).map((x) => ({ value: x.value, date: x.date })));
      });
    }
  } catch { /* best-effort */ }

  // ── PDF setup ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_H = 8;
  const FOOTER_RESERVE = FOOTER_H + 22;

  // ── Column layout ─────────────────────────────────────────────────────────
  const cellPad = 3;
  const COL_NAME_START = marginX + cellPad;
  const COL_NAME_END   = marginX + 77;
  const COL_RESULT     = marginX + 80;
  const COL_REF        = marginX + 117;
  const COL_UNIT       = marginX + 165;
  const COL_RESULT_DIV = COL_RESULT - cellPad;
  const COL_REF_DIV    = COL_REF    - cellPad;
  const COL_UNIT_DIV   = COL_UNIT   - cellPad;

  // ── Header / footer helpers ───────────────────────────────────────────────
  const drawPageHeader = () => {
    doc.setFillColor(15, 76, 129);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const hospitalName = (hospital?.hospital_name || 'Hospital').toUpperCase();
    let titleSize = 18;
    doc.setFontSize(titleSize);
    while (doc.getTextWidth(hospitalName) > pageWidth - 60 && titleSize > 10) {
      titleSize--; doc.setFontSize(titleSize);
    }
    doc.text(hospitalName, pageWidth / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Accurate  |  Caring  |  Instant', pageWidth / 2, 17, { align: 'center' });
    doc.setFontSize(8);
    doc.text(hospital?.contact_number || '', pageWidth - marginX, 17, { align: 'right' });

    doc.setFillColor(240, 240, 240);
    doc.rect(0, 22, pageWidth, 6, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text(hospital?.hospital_address || '', pageWidth / 2, 26, { align: 'center' });

    doc.setDrawColor(15, 76, 129);
    doc.setLineWidth(0.6);
    doc.line(marginX, 30, pageWidth - marginX, 30);
    doc.setTextColor(0, 0, 0);
  };

  const drawPageFooter = () => {
    doc.setFillColor(15, 76, 129);
    doc.rect(0, pageHeight - FOOTER_H, pageWidth, FOOTER_H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `${data.status === 'final' ? 'FINAL REPORT' : 'DRAFT'}  ·  Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd-MMM-yyyy hh:mm a')}`,
      marginX, pageHeight - 3
    );
    doc.text('Computer-generated report', pageWidth - marginX, pageHeight - 3, { align: 'right' });
  };

  const newPage = (): number => {
    drawPageFooter();
    doc.addPage();
    drawPageHeader();
    return 36;
  };

  const safeBottom = () => pageHeight - FOOTER_RESERVE;

  // ── Chip measurement helper ───────────────────────────────────────────────
  const countChipRows = (
    prev: Array<{ value: string; date: string }>,
    startX: number,
    maxX: number
  ): number => {
    doc.setFontSize(7);
    let px = startX;
    let rows = 1;
    for (const pr of prev) {
      const d = pr.date ? formatInPakistanTime(pr.date, 'dd MMM yy') : '—';
      const chipText = `${d}: ${pr.value}`;
      const chipW = doc.getTextWidth(chipText) + 5;
      if (px + chipW > maxX) { rows++; px = startX; }
      px += chipW + 3;
    }
    doc.setFontSize(9);
    return rows;
  };

  // ── Height estimators ─────────────────────────────────────────────────────
  const measureParamHeight = (p: PathologyPdfParameter): number => {
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(p.parameter_name, COL_RESULT - cellPad - COL_NAME_START);
    const refText = p.display_all_subranges
      ? (p.ref_display || '( See Below )')
      : (p.subrange_used ? `${p.subrange_used}: ${p.ref_display || '—'}` : (p.ref_display || '—'));
    const refLines = doc.splitTextToSize(refText, COL_UNIT - cellPad - COL_REF);
    let h = 5 * Math.max(nameLines.length, refLines.length, 1);

    if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
      h += p.subranges.length * 4 + 1;
    }

    const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
    if (prev && prev.length > 0) {
      const rows = countChipRows(prev, COL_NAME_START + 20, COL_NAME_END - 2);
      h += rows * 5 + 4;
    }
    return h;
  };

  const measureTestHeight = (tt: PathologyPdfTestType): number => {
    let h = 5;
    if (tt.report_category) h += 4;
    if (data.sampleType) h += 4;
    h += 8 + 5;

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
    h += 4;
    return h;
  };

  // ── Page 1: draw header + logo ────────────────────────────────────────────
  drawPageHeader();
  if (hospital?.logo_url) {
    const dataUrl = await loadImageDataUrl(hospital.logo_url);
    if (dataUrl) {
      try { doc.addImage(dataUrl, 'PNG', marginX, 4, 14, 14); } catch { /* ignore */ }
    }
  }

  doc.setTextColor(0, 0, 0);
  let y = 36;

  // ── Patient info block ────────────────────────────────────────────────────
  const rightX       = pageWidth / 2 + 4;
  const rightLabelX  = pageWidth - marginX - 58;
  const rightValueX  = pageWidth - marginX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.patientName?.toUpperCase() || '—', marginX, y);

  doc.setFontSize(9);
  doc.text('Sample Collected At:', rightX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const collectionLines = doc.splitTextToSize(
    data.collectionAddress || hospital?.hospital_address || '—',
    rightLabelX - rightX - 4
  );
  doc.text(collectionLines, rightX, y + 5);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Age: ${data.patientAge ?? '—'} Years    Sex: ${data.patientSex || '—'}`, marginX, y);
  y += 5;
  doc.text(`PID: ${data.patientId || '—'}`, marginX, y);
  y += 5;
  doc.text(`Ref. By: ${data.referredBy || '—'}`, marginX, y);
  const leftBlockBottom = y;

  let yr = Math.max(42, 36 + 5 + collectionLines.length * 4 + 4);
  const timeRows: [string, string][] = [
    ['Registered on:', fmt(data.registeredAt)],
    ['Collected on:',  fmt(data.collectedAt)],
    ['Reported on:',   fmt(data.reportedAt)],
    ['Report No:',     data.reportNumber],
  ];
  doc.setFontSize(8);
  for (const [label, value] of timeRows) {
    doc.setFont('helvetica', 'bold');   doc.text(label, rightLabelX, yr);
    doc.setFont('helvetica', 'normal'); doc.text(value, rightValueX, yr, { align: 'right' });
    yr += 5;
  }

  y = Math.max(leftBlockBottom, yr) + 7;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // ── Render each test ──────────────────────────────────────────────────────
  for (const tt of data.testTypes) {
    const testH      = measureTestHeight(tt);
    const usable     = safeBottom() - 18;
    const remaining  = safeBottom() - y;

    // If test fits on a fresh page and won't fit in remaining space, push to next page.
    // Otherwise still push if there's barely any room left.
    if ((testH <= usable && remaining < testH) || remaining < 40) {
      y = newPage();
    }

    // ── Test title ────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(tt.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
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

    // ── Column header row ─────────────────────────────────────────────────
    const headerHeight = 8;
    const headerTop    = y;
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, headerTop, contentWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Investigation',   COL_NAME_START, y + 5.5);
    doc.text('Result',          COL_RESULT,     y + 5.5);
    doc.text('Reference Value', COL_REF,        y + 5.5);
    doc.text('Unit',            COL_UNIT,       y + 5.5);
    const headerBottom = headerTop + headerHeight;
    doc.setDrawColor(200, 200, 200);
    doc.line(marginX, headerBottom, pageWidth - marginX, headerBottom);
    y = headerBottom + 5;

    let segHeaderTop    = headerTop;
    let segHeaderBottom = headerBottom;

    const closeTableSegment = (bottomY: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(marginX,             segHeaderTop, marginX,             bottomY);
      doc.line(pageWidth - marginX, segHeaderTop, pageWidth - marginX, bottomY);
      doc.line(marginX,             segHeaderTop, pageWidth - marginX, segHeaderTop);
      doc.line(marginX,             bottomY,      pageWidth - marginX, bottomY);
      [COL_RESULT_DIV, COL_REF_DIV, COL_UNIT_DIV].forEach(vx => {
        doc.line(vx, segHeaderTop, vx, bottomY);
      });
    };

    // ── Parameter rows ────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    let lastHeading: string | null = null;

    for (const p of tt.parameters) {
      const headingH = (p.category_heading && p.category_heading !== lastHeading) ? 5 : 0;
      const paramH   = measureParamHeight(p);
      const needed   = headingH + paramH;

      if (y + needed > safeBottom()) {
        closeTableSegment(y);
        y = newPage();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${tt.name.toUpperCase()} (cont.)`, pageWidth / 2, y, { align: 'center' });
        y += 5;

        segHeaderTop = y;
        doc.setFillColor(245, 245, 245);
        doc.rect(marginX, segHeaderTop, contentWidth, headerHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Investigation',   COL_NAME_START, y + 5.5);
        doc.text('Result',          COL_RESULT,     y + 5.5);
        doc.text('Reference Value', COL_REF,        y + 5.5);
        doc.text('Unit',            COL_UNIT,       y + 5.5);
        segHeaderBottom = segHeaderTop + headerHeight;
        doc.setDrawColor(200, 200, 200);
        doc.line(marginX, segHeaderBottom, pageWidth - marginX, segHeaderBottom);
        y = segHeaderBottom + 5;
      }

      // Group heading
      if (p.category_heading && p.category_heading !== lastHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 76, 129);
        doc.text(p.category_heading, COL_NAME_START, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        lastHeading = p.category_heading;
      }

      // Parameter name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const nameLines = doc.splitTextToSize(p.parameter_name, COL_RESULT - cellPad - COL_NAME_START);
      doc.text(nameLines, COL_NAME_START, y);

      // Result + flag
      const flag = p.flag;
      const resultText = p.result_value ?? '—';
      if      (flag === 'High')       doc.setTextColor(200, 30, 30);
      else if (flag === 'Low')        doc.setTextColor(30, 64, 175);
      else if (flag === 'Borderline') doc.setTextColor(200, 120, 30);
      else                            doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', flag ? 'bold' : 'normal');
      doc.text(resultText, COL_RESULT, y);
      if (flag) {
        const valW = doc.getTextWidth(resultText);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(`  ${flag}`, COL_RESULT + valW, y);
        doc.setFontSize(9);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // Reference
      const refText = p.display_all_subranges
        ? (p.ref_display || '( See Below )')
        : (p.subrange_used
            ? `${p.subrange_used}: ${p.ref_display || '—'}`
            : (p.ref_display || '—'));
      const refLines = doc.splitTextToSize(refText, COL_UNIT - cellPad - COL_REF);
      doc.text(refLines, COL_REF, y);

      // Unit
      doc.text(p.unit || '—', COL_UNIT, y);

      y += 5 * Math.max(nameLines.length, refLines.length, 1);

      // Subranges
      if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
        for (const sr of p.subranges) {
          if (y > safeBottom()) {
            closeTableSegment(y);
            y = newPage();
            segHeaderTop = y;
            doc.setFillColor(245, 245, 245);
            doc.rect(marginX, segHeaderTop, contentWidth, headerHeight, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text('Investigation',   COL_NAME_START, y + 5.5);
            doc.text('Result',          COL_RESULT,     y + 5.5);
            doc.text('Reference Value', COL_REF,        y + 5.5);
            doc.text('Unit',            COL_UNIT,       y + 5.5);
            segHeaderBottom = segHeaderTop + headerHeight;
            doc.setDrawColor(200, 200, 200);
            doc.line(marginX, segHeaderBottom, pageWidth - marginX, segHeaderBottom);
            y = segHeaderBottom + 5;
          }
          const isSelected =
            (p.subrange_id && sr.id === p.subrange_id) ||
            (!p.subrange_id && p.subrange_used && sr.label === p.subrange_used);
          if (isSelected) {
            doc.setFillColor(255, 249, 196);
            doc.rect(marginX + 0.3, y - 3.5, contentWidth - 0.6, 4.6, 'F');
          }
          doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
          doc.setFontSize(8);
          doc.setTextColor(70, 70, 70);
          doc.text(sr.label, COL_NAME_START + 4, y);
          const srRef = sr.ref_display ||
            (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} - ${sr.ref_max}` : '—');
          doc.text(srRef, COL_REF, y);
          doc.text(p.unit || '', COL_UNIT, y);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          y += 4;
        }
        y += 1;
      }

      // ── Previous results chips (confined to Investigation column) ─────────
      const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
      if (prev && prev.length > 0) {
        if (y > safeBottom()) {
          closeTableSegment(y);
          y = newPage();
          segHeaderTop = y;
          doc.setFillColor(245, 245, 245);
          doc.rect(marginX, segHeaderTop, contentWidth, headerHeight, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.text('Investigation',   COL_NAME_START, y + 5.5);
          doc.text('Result',          COL_RESULT,     y + 5.5);
          doc.text('Reference Value', COL_REF,        y + 5.5);
          doc.text('Unit',            COL_UNIT,       y + 5.5);
          segHeaderBottom = segHeaderTop + headerHeight;
          doc.setDrawColor(200, 200, 200);
          doc.line(marginX, segHeaderBottom, pageWidth - marginX, segHeaderBottom);
          y = segHeaderBottom + 5;
        }

        const chipRowH   = 5;
        const chipStartX = COL_NAME_START + 20;
        const chipMaxX   = COL_NAME_END - 2;
        const labelW     = 18;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text('Previous', COL_NAME_START, y);

        let px = COL_NAME_START + labelW;

        for (let i = 0; i < prev.length; i++) {
          const pr = prev[i];
          const d  = pr.date ? formatInPakistanTime(pr.date, 'dd MMM yy') : '—';
          const chipText = `${d}: ${pr.value}`;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          const chipW = doc.getTextWidth(chipText) + 5;

          if (px + chipW > chipMaxX) {
            y  += chipRowH;
            px  = chipStartX;
            if (y > safeBottom()) {
              closeTableSegment(y);
              y = newPage();
              segHeaderTop = y;
              doc.setFillColor(245, 245, 245);
              doc.rect(marginX, segHeaderTop, contentWidth, headerHeight, 'F');
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.text('Investigation',   COL_NAME_START, y + 5.5);
              doc.text('Result',          COL_RESULT,     y + 5.5);
              doc.text('Reference Value', COL_REF,        y + 5.5);
              doc.text('Unit',            COL_UNIT,       y + 5.5);
              segHeaderBottom = segHeaderTop + headerHeight;
              doc.setDrawColor(200, 200, 200);
              doc.line(marginX, segHeaderBottom, pageWidth - marginX, segHeaderBottom);
              y = segHeaderBottom + 5;
            }
          }

          doc.setFillColor(225, 225, 225);
          doc.roundedRect(px - 1, y - 3.2, chipW, 4.5, 0.8, 0.8, 'F');
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(chipText, px + 1.5, y);

          px += chipW + 3;
        }

        y += 4;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
    } // end parameters loop

    // Close table
    y += 2;
    closeTableSegment(y);
    y += 1;

    // Method / Instrument / Notes (outside table)
    y += 2;
    if (tt.method || data.instrument) {
      if (y > safeBottom() - 6) { y = newPage(); }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const segs: string[] = [];
      if (data.instrument) segs.push(`Instruments: ${data.instrument}`);
      if (tt.method)       segs.push(`Method: ${tt.method}`);
      doc.text(segs.join('   |   '), marginX, y);
      y += 5;
    }
    if (tt.notes) {
      if (y > safeBottom() - 8) { y = newPage(); }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const noteLines = doc.splitTextToSize(tt.notes, contentWidth);
      doc.text(noteLines, marginX, y);
      y += noteLines.length * 3.5;
    }
    y += 4;
  } // end testTypes loop

  // ── Interpretation ────────────────────────────────────────────────────────
  if (data.interpretation) {
    if (y > safeBottom() - 15) { y = newPage(); }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Interpretation:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.interpretation, contentWidth - 25);
    doc.text(lines, marginX + 25, y);
    y += lines.length * 4 + 2;
  }

  // ── End of report ─────────────────────────────────────────────────────────
  if (y > safeBottom() - 10) { y = newPage(); }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('****End of Report****', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ── QR Code ───────────────────────────────────────────────────────────────
  try {
    const appOrigin = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://southwesthospitalkohat.com';
    const verifyUrl = `${appOrigin}/verify-report/${data.reportNumber}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });
    const qrSize = 22;

    if (y + qrSize > safeBottom()) { y = newPage(); }
    const qrX = marginX;
    const qrY = y;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Scan to Verify', qrX + qrSize + 2, qrY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const urlLines = doc.splitTextToSize(verifyUrl, 70);
    doc.text(urlLines, qrX + qrSize + 2, qrY + 9);
    doc.setTextColor(0, 0, 0);
  } catch { /* best-effort */ }

  // ── Footer on last page ───────────────────────────────────────────────────
  drawPageFooter();

  // ── Output ────────────────────────────────────────────────────────────────
  try {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const w = window.open(blobUrl as unknown as string, '_blank');
    if (!w) doc.save(`Lab_${data.reportNumber}.pdf`);
  } catch {
    doc.save(`Lab_${data.reportNumber}.pdf`);
  }
}