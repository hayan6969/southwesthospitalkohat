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

  // Fetch previous results
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

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_RESERVE = 30; // space kept free at bottom for footer

  // ── helpers ──────────────────────────────────────────────────────────────
  const drawHeader = () => {
    // Blue band
    doc.setFillColor(15, 76, 129);
    doc.rect(0, 0, pageWidth, 22, 'F');

    if (hospital?.logo_url) { /* logo already drawn on page 1 – skip on subsequent */ }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const hospitalName = (hospital?.hospital_name || 'Hospital').toUpperCase();
    let titleSize = 18;
    doc.setFontSize(titleSize);
    const maxTitleWidth = pageWidth - 60;
    while (doc.getTextWidth(hospitalName) > maxTitleWidth && titleSize > 10) {
      titleSize -= 1; doc.setFontSize(titleSize);
    }
    doc.text(hospitalName, pageWidth / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Accurate  |  Caring  |  Instant', pageWidth / 2, 17, { align: 'center' });
    doc.setFontSize(8);
    doc.text(hospital?.contact_number || '', pageWidth - marginX, 17, { align: 'right' });

    // Address strip
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 22, pageWidth, 6, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text(hospital?.hospital_address || '', pageWidth / 2, 26, { align: 'center' });

    // Accent line
    doc.setDrawColor(15, 76, 129);
    doc.setLineWidth(0.6);
    doc.line(marginX, 30, pageWidth - marginX, 30);
    doc.setTextColor(0, 0, 0);
  };

  const drawFooter = () => {
    doc.setFillColor(15, 76, 129);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `${data.status === 'final' ? 'FINAL REPORT' : 'DRAFT'}  ·  Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd-MMM-yyyy hh:mm a')}`,
      marginX, pageHeight - 3
    );
    doc.text('Computer-generated report', pageWidth - marginX, pageHeight - 3, { align: 'right' });
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    drawHeader();
    return 36; // y after header
  };

  // ── Page 1 header ─────────────────────────────────────────────────────────
  drawHeader();

  // Logo (page 1 only)
  if (hospital?.logo_url) {
    const dataUrl = await loadImageDataUrl(hospital.logo_url);
    if (dataUrl) {
      try { doc.addImage(dataUrl, 'PNG', marginX, 4, 14, 14); } catch { /* ignore */ }
    }
  }

  doc.setTextColor(0, 0, 0);
  let y = 36;

  // ── Patient block ─────────────────────────────────────────────────────────
  const leftX = marginX;
  const rightX = pageWidth / 2 + 4;
  const rightLabelX = pageWidth - marginX - 58;
  const rightValueX = pageWidth - marginX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.patientName?.toUpperCase() || '—', leftX, y);
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
  doc.text(`Age: ${data.patientAge ?? '—'} Years    Sex: ${data.patientSex || '—'}`, leftX, y);
  y += 5;
  doc.text(`PID: ${data.patientId || '—'}`, leftX, y);
  y += 5;
  doc.text(`Ref. By: ${data.referredBy || '—'}`, leftX, y);
  const leftBlockBottom = y;

  let yr = Math.max(42, 36 + 5 + collectionLines.length * 4 + 4);
  doc.setFontSize(8);
  const timeRows: Array<[string, string]> = [
    ['Registered on:', fmt(data.registeredAt)],
    ['Collected on:', fmt(data.collectedAt)],
    ['Reported on:', fmt(data.reportedAt)],
    ['Report No:', data.reportNumber],
  ];
  for (const [label, value] of timeRows) {
    doc.setFont('helvetica', 'bold'); doc.text(label, rightLabelX, yr);
    doc.setFont('helvetica', 'normal'); doc.text(value, rightValueX, yr, { align: 'right' });
    yr += 5;
  }

  y = Math.max(leftBlockBottom, yr) + 7;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // ── Column positions ──────────────────────────────────────────────────────
  const cellPad = 3;
  const colX = {
    name: marginX + cellPad,       // Investigation text start
    nameEnd: marginX + 77,         // Investigation column right edge (for chip constraint)
    result: marginX + 80,
    ref: marginX + 117,
    unit: marginX + 165,
  };

  // ── Measure helpers ───────────────────────────────────────────────────────
  /** Height (mm) needed to render a single parameter row including subranges & prev */
  const measureParamHeight = (p: PathologyPdfParameter): number => {
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(p.parameter_name, colX.result - cellPad - colX.name);
    const refText = p.display_all_subranges
      ? (p.ref_display || '( See Below )')
      : (p.subrange_used ? `${p.subrange_used}: ${p.ref_display || '—'}` : (p.ref_display || '—'));
    const refLines = doc.splitTextToSize(refText, colX.unit - cellPad - colX.ref);
    let h = 5 * Math.max(nameLines.length, refLines.length, 1);

    if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
      h += p.subranges.length * 4 + 1;
    }

    const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
    if (prev && prev.length > 0) {
      // measure chip widths to calculate rows needed
      doc.setFontSize(7);
      const maxChipX = colX.nameEnd; // chips confined to Investigation column width
      let px = colX.name + 20;
      let chipRows = 1;
      for (const pr of prev) {
        const d = pr.date ? formatInPakistanTime(pr.date, 'dd MMM yy') : '—';
        const chipText = `${d}: ${pr.value}`;
        const chipW = doc.getTextWidth(chipText) + 5;
        if (px + chipW > maxChipX) { chipRows++; px = colX.name + 20; }
        px += chipW + 3;
      }
      doc.setFontSize(9);
      h += chipRows * 5 + 4;
    }
    return h;
  };

  /** Total height (mm) needed to render an entire test type block */
  const measureTestHeight = (tt: PathologyPdfTestType): number => {
    let h = 0;
    h += 5; // title
    if (tt.report_category) h += 4;
    if (data.sampleType) h += 4;
    h += 8 + 5; // header row + gap

    let lastH: string | null = null;
    for (const p of tt.parameters) {
      if (p.category_heading && p.category_heading !== lastH) { h += 5; lastH = p.category_heading; }
      h += measureParamHeight(p);
    }
    h += 2 + 1; // bottom padding + border
    if (tt.method || data.instrument) h += 4;
    if (tt.notes) {
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(tt.notes, contentWidth);
      h += noteLines.length * 3.5;
      doc.setFontSize(9);
    }
    h += 3;
    return h;
  };

  // ── Render tests ──────────────────────────────────────────────────────────
  for (const tt of data.testTypes) {
    const testH = measureTestHeight(tt);
    const usableHeight = pageHeight - FOOTER_RESERVE - 18; // 18 = header height on subsequent pages

    // If the whole test fits on a fresh page but not on current page → new page
    if (testH <= usableHeight && (pageHeight - FOOTER_RESERVE - y) < testH) {
      y = addPage();
    } else if (y > pageHeight - FOOTER_RESERVE - 20) {
      y = addPage();
    }

    // Test title
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

    // Column header row
    const headerHeight = 8;
    const headerTop = y;
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, headerTop, contentWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Investigation', colX.name, y + 5.5);
    doc.text('Result', colX.result, y + 5.5);
    doc.text('Reference Value', colX.ref, y + 5.5);
    doc.text('Unit', colX.unit, y + 5.5);
    const headerBottom = headerTop + headerHeight;
    doc.setDrawColor(200, 200, 200);
    doc.line(marginX, headerBottom, pageWidth - marginX, headerBottom);
    y = headerBottom + 5;

    const tableLeft = marginX;
    const tableRight = pageWidth - marginX;

    // Parameter rows
    doc.setFont('helvetica', 'normal');
    let lastHeading: string | null = null;

    for (const p of tt.parameters) {
      const paramH = measureParamHeight(p);
      const headingH = (p.category_heading && p.category_heading !== lastHeading) ? 5 : 0;
      const needed = headingH + paramH;

      // Page break mid-table: close current table, new page, reopen header
      if (y + needed > pageHeight - FOOTER_RESERVE) {
        // Close table so far
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft, y, tableRight, y);
        doc.line(tableLeft, headerTop, tableLeft, y);
        doc.line(tableRight, headerTop, tableRight, y);
        doc.line(tableLeft, headerTop, tableRight, headerTop);
        [colX.result - cellPad, colX.ref - cellPad, colX.unit - cellPad].forEach((vx) => {
          doc.line(vx, headerTop, vx, y);
        });

        y = addPage();

        // Reopen header on new page (continuation label)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${tt.name.toUpperCase()} (cont.)`, pageWidth / 2, y, { align: 'center' });
        y += 5;
        const contHeaderTop = y;
        doc.setFillColor(245, 245, 245);
        doc.rect(marginX, contHeaderTop, contentWidth, headerHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Investigation', colX.name, y + 5.5);
        doc.text('Result', colX.result, y + 5.5);
        doc.text('Reference Value', colX.ref, y + 5.5);
        doc.text('Unit', colX.unit, y + 5.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(marginX, contHeaderTop + headerHeight, pageWidth - marginX, contHeaderTop + headerHeight);
        y = contHeaderTop + headerHeight + 5;
        // Note: we do NOT update headerTop here intentionally – borders drawn per-segment
      }

      // Group heading
      if (p.category_heading && p.category_heading !== lastHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 76, 129);
        doc.text(p.category_heading, colX.name, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        lastHeading = p.category_heading;
      }

      const flag = p.flag;
      const resultText = p.result_value ?? '—';

      // Parameter name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const nameLines = doc.splitTextToSize(p.parameter_name, colX.result - cellPad - colX.name);
      doc.text(nameLines, colX.name, y);

      // Result with flag
      if (flag === 'High') doc.setTextColor(200, 30, 30);
      else if (flag === 'Low') doc.setTextColor(30, 64, 175);
      else if (flag === 'Borderline') doc.setTextColor(200, 120, 30);
      else doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', flag ? 'bold' : 'normal');
      doc.text(resultText, colX.result, y);
      if (flag) {
        const valW = doc.getTextWidth(resultText);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(`  ${flag}`, colX.result + valW, y);
        doc.setFontSize(9);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // Reference
      const refText = p.display_all_subranges
        ? (p.ref_display || '( See Below )')
        : (p.subrange_used ? `${p.subrange_used}: ${p.ref_display || '—'}` : (p.ref_display || '—'));
      const refLines = doc.splitTextToSize(refText, colX.unit - cellPad - colX.ref);
      doc.text(refLines, colX.ref, y);

      // Unit
      doc.text(p.unit || '—', colX.unit, y);

      y += 5 * Math.max(nameLines.length, refLines.length, 1);

      // Subranges
      if (p.display_all_subranges && p.subranges && p.subranges.length > 0) {
        for (const sr of p.subranges) {
          if (y > pageHeight - FOOTER_RESERVE) { y = addPage(); }
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
          doc.text(sr.label, colX.name + 4, y);
          const srRef = sr.ref_display ||
            (sr.ref_min != null && sr.ref_max != null ? `${sr.ref_min} - ${sr.ref_max}` : '—');
          doc.text(srRef, colX.ref, y);
          doc.text(p.unit || '', colX.unit, y);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          y += 4;
        }
        y += 1;
      }

      // ── Previous results chips (constrained to Investigation column) ──────
      const prev = p.parameter_id ? previousByParam.get(p.parameter_id) : undefined;
      if (prev && prev.length > 0) {
        if (y > pageHeight - FOOTER_RESERVE) { y = addPage(); }

        const prevRowBgH = 5.5;
        doc.setFillColor(248, 248, 248);
        // Background only under Investigation column
        doc.rect(marginX + 0.3, y - 3, colX.nameEnd - marginX - 0.6, prevRowBgH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text('Previous', colX.name, y);

        // Chips – constrained to [colX.name + 20 … colX.nameEnd]
        let px = colX.name + 20;
        const chipMaxX = colX.nameEnd - 2; // right boundary = end of Investigation column

        for (const pr of prev) {
          const d = pr.date ? formatInPakistanTime(pr.date, 'dd MMM yy') : '—';
          const chipText = `${d}: ${pr.value}`;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          const chipW = doc.getTextWidth(chipText) + 5;

          if (px + chipW > chipMaxX) {
            // Wrap to next line within Investigation column
            y += 5;
            px = colX.name + 20;
            if (y > pageHeight - FOOTER_RESERVE) { y = addPage(); }
            doc.setFillColor(248, 248, 248);
            doc.rect(marginX + 0.3, y - 3, colX.nameEnd - marginX - 0.6, prevRowBgH, 'F');
          }

          doc.setFillColor(225, 225, 225);
          doc.roundedRect(px - 1, y - 3.2, chipW, 4.5, 0.8, 0.8, 'F');
          doc.setTextColor(60, 60, 60);
          doc.text(chipText, px + 1.5, y);

          px += chipW + 3;
        }

        y += 4;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
    }

    // Bottom padding
    y += 2;

    // Draw table borders
    doc.setDrawColor(200, 200, 200);
    doc.line(tableLeft, y, tableRight, y);
    doc.line(tableLeft, headerTop, tableLeft, y);
    doc.line(tableRight, headerTop, tableRight, y);
    doc.line(tableLeft, headerTop, tableRight, headerTop);
    [colX.result - cellPad, colX.ref - cellPad, colX.unit - cellPad].forEach((vx) => {
      doc.line(vx, headerTop, vx, y);
    });
    y += 1;

    // Method / Instrument / Notes
    y += 1;
    if (tt.method || data.instrument) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const segs: string[] = [];
      if (data.instrument) segs.push(`Instruments: ${data.instrument}`);
      if (tt.method) segs.push(`Method: ${tt.method}`);
      doc.text(segs.join('   |   '), marginX, y);
      y += 4;
    }
    if (tt.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(tt.notes, contentWidth);
      doc.text(noteLines, marginX, y);
      y += noteLines.length * 3.5;
    }
    y += 3;
  }

  // ── Interpretation ────────────────────────────────────────────────────────
  if (data.interpretation) {
    if (y > pageHeight - FOOTER_RESERVE - 15) { y = addPage(); }
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
  if (y > pageHeight - FOOTER_RESERVE - 10) { y = addPage(); }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('****End of Report****', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // ── QR Code ───────────────────────────────────────────────────────────────
  try {
    // Build a clean, absolute verify URL
    const appOrigin = typeof window !== 'undefined'
      ? window.location.origin          // e.g. https://southwesthospitalkohat.com
      : 'https://southwesthospitalkohat.com';
    const verifyUrl = `${appOrigin}/verify-report/${data.reportNumber}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 });
    const qrSize = 22;
    const qrX = marginX;
    const qrY = Math.min(pageHeight - FOOTER_RESERVE - qrSize - 2, y);
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
    y = qrY + qrSize + 2;
  } catch { /* best-effort */ }

  // ── Signatures ────────────────────────────────────────────────────────────
  const sigY = Math.min(pageHeight - FOOTER_RESERVE - 8, y + 4);
  const sigCols = [pageWidth / 2 - 20, pageWidth - marginX - 50];
  doc.setDrawColor(80, 80, 80);
  for (const sx of sigCols) {
    doc.line(sx, sigY, sx + 40, sigY);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Pathologist', sigCols[0], sigY + 4);
  doc.text('Authorised Signatory', sigCols[1], sigY + 4);

  // ── Footer on last page ───────────────────────────────────────────────────
  drawFooter();

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