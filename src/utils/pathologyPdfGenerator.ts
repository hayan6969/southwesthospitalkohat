import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { formatInPakistanTime } from './timezone';

export interface PathologyPdfParameter {
  category_heading: string | null;
  parameter_name: string;
  unit: string | null;
  ref_display: string | null;
  result_value: string | null;
  flag: 'Low' | 'High' | 'Borderline' | null;
  subrange_used?: string | null;
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
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;

  // ============== HEADER BAND (blue) ==============
  doc.setFillColor(15, 76, 129); // deep blue
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Logo
  if (hospital?.logo_url) {
    const dataUrl = await loadImageDataUrl(hospital.logo_url);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'PNG', marginX, 4, 14, 14);
      } catch { /* ignore */ }
    }
  }

  // Hospital name centered
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text((hospital?.hospital_name || 'Hospital').toUpperCase(), pageWidth / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Accurate  |  Caring  |  Instant', pageWidth / 2, 17, { align: 'center' });

  // Right-side phone
  doc.setFontSize(8);
  doc.text(hospital?.contact_number || '', pageWidth - marginX, 9, { align: 'right' });

  // Address strip
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 22, pageWidth, 6, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text(hospital?.hospital_address || '', pageWidth / 2, 26, { align: 'center' });

  // Thin accent line
  doc.setDrawColor(15, 76, 129);
  doc.setLineWidth(0.6);
  doc.line(marginX, 30, pageWidth - marginX, 30);

  doc.setTextColor(0, 0, 0);
  let y = 34;

  // ============== PATIENT BLOCK (2 columns) ==============
  const leftX = marginX;
  const rightX = pageWidth / 2 + 4;
  const labelKV = (label: string, value: string, x: number, yy: number, valueX = x + 24) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x, yy);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', valueX, yy);
  };

  // Big patient name + meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.patientName?.toUpperCase() || '—', leftX, y);
  // Right header — sample collected at
  doc.setFontSize(9);
  doc.text('Sample Collected At:', rightX, y - 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const collectionLines = doc.splitTextToSize(
    data.collectionAddress || hospital?.hospital_address || '—',
    pageWidth - rightX - marginX
  );
  doc.text(collectionLines, rightX, y + 3.5);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const ageSex = `Age: ${data.patientAge ?? '—'} Years    Sex: ${data.patientSex || '—'}`;
  doc.text(ageSex, leftX, y);
  y += 4;
  doc.text(`PID: ${data.patientId || '—'}`, leftX, y);
  y += 4;
  doc.text(`Ref. By: ${data.referredBy || '—'}`, leftX, y);

  // Right column — registered/collected/reported (align with top of right block)
  let yr = y - 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Registered on:', pageWidth - marginX - 55, yr);
  doc.setFont('helvetica', 'normal');
  doc.text(fmt(data.registeredAt), pageWidth - marginX, yr, { align: 'right' });
  yr += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Collected on:', pageWidth - marginX - 55, yr);
  doc.setFont('helvetica', 'normal');
  doc.text(fmt(data.collectedAt), pageWidth - marginX, yr, { align: 'right' });
  yr += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Reported on:', pageWidth - marginX - 55, yr);
  doc.setFont('helvetica', 'normal');
  doc.text(fmt(data.reportedAt), pageWidth - marginX, yr, { align: 'right' });
  yr += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Report No:', pageWidth - marginX - 55, yr);
  doc.setFont('helvetica', 'normal');
  doc.text(data.reportNumber, pageWidth - marginX, yr, { align: 'right' });

  y = Math.max(y, yr) + 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // ============== TESTS ==============
  const colX = { name: marginX + 1, result: marginX + 78, ref: marginX + 115, unit: marginX + 165 };

  for (const tt of data.testTypes) {
    if (y > pageHeight - 50) { doc.addPage(); y = 18; }

    // Test type title — centered
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(tt.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Report category sub-title
    if (tt.report_category) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(tt.report_category, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 4;
    }

    // Sample type strip
    if (data.sampleType) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Primary Sample Type :', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.sampleType, marginX + 38, y);
      y += 4;
    }

    // Header row
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, y - 3.5, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Investigation', colX.name, y);
    doc.text('Result', colX.result, y);
    doc.text('Reference Value', colX.ref, y);
    doc.text('Unit', colX.unit, y);
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(marginX, y - 1, pageWidth - marginX, y - 1);
    y += 1;

    // Rows
    doc.setFont('helvetica', 'normal');
    for (const p of tt.parameters) {
      if (y > pageHeight - 30) { doc.addPage(); y = 18; }

      if (p.category_heading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 76, 129);
        doc.text(p.category_heading, colX.name, y);
        doc.setTextColor(0, 0, 0);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        continue;
      }

      const flag = p.flag;
      const resultText = (p.result_value ?? '—');
      const flagLabel = flag ? `  ${flag}` : '';

      // Parameter name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const nameLines = doc.splitTextToSize(p.parameter_name, colX.result - colX.name - 2);
      doc.text(nameLines, colX.name, y);

      // Result (bold + colored if flagged)
      if (flag === 'High') doc.setTextColor(200, 30, 30);
      else if (flag === 'Low') doc.setTextColor(30, 64, 175);
      else if (flag === 'Borderline') doc.setTextColor(200, 120, 30);
      else doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', flag ? 'bold' : 'normal');
      doc.text(resultText, colX.result, y);
      // small flag tag right after value
      if (flag) {
        const valW = doc.getTextWidth(resultText);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(flagLabel, colX.result + valW, y);
        doc.setFontSize(9);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      // Reference
      const refText = p.subrange_used
        ? `${p.subrange_used}: ${p.ref_display || '—'}`
        : (p.ref_display || '—');
      const refLines = doc.splitTextToSize(refText, colX.unit - colX.ref - 2);
      doc.text(refLines, colX.ref, y);

      // Unit
      doc.text(p.unit || '—', colX.unit, y);

      const lineCount = Math.max(nameLines.length, refLines.length, 1);
      y += 4.5 * lineCount;
    }

    // Method / Instrument / Notes
    y += 1;
    if (tt.method || data.instrument) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
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

  // Interpretation
  if (data.interpretation) {
    if (y > pageHeight - 40) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Interpretation:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.interpretation, contentWidth - 25);
    doc.text(lines, marginX + 25, y);
    y += lines.length * 4 + 2;
  }

  // End of report
  if (y > pageHeight - 35) { doc.addPage(); y = 18; }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('****End of Report****', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Signatures
  const sigY = Math.min(pageHeight - 22, y + 4);
  const sigCols = [marginX + 10, pageWidth / 2 - 20, pageWidth - marginX - 50];
  doc.setDrawColor(80, 80, 80);
  for (const sx of sigCols) {
    doc.line(sx, sigY, sx + 40, sigY);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Medical Lab Technician', sigCols[0], sigY + 4);
  doc.text('Pathologist', sigCols[1], sigY + 4);
  doc.text('Authorised Signatory', sigCols[2], sigY + 4);

  // Footer band
  doc.setFillColor(15, 76, 129);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${data.status === 'final' ? 'FINAL REPORT' : 'DRAFT'}  ·  Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd-MMM-yyyy hh:mm a')}`,
    marginX,
    pageHeight - 3
  );
  doc.text('Computer-generated report', pageWidth - marginX, pageHeight - 3, { align: 'right' });

  doc.save(`Lab_${data.reportNumber}.pdf`);
}
