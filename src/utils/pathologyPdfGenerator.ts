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
  patientId: string;       // patient_number e.g. P-00001
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
    return formatInPakistanTime(iso, 'dd-MMM-yyyy hh:mm a');
  } catch {
    return iso;
  }
};

export async function generatePathologyReportPDF(data: PathologyPdfData) {
  const hospital = await fetchHospital();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  let y = 12;

  // ===== Header =====
  if (hospital?.logo_url) {
    try {
      // jsPDF accepts data URLs directly
      const res = await fetch(hospital.logo_url);
      const blob = await res.blob();
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, 'PNG', marginX, y, 22, 22);
    } catch {
      /* ignore logo errors */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(hospital?.hospital_name || 'Hospital', pageWidth / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(hospital?.hospital_address || '', pageWidth / 2, y + 12, { align: 'center' });
  doc.text(`Phone: ${hospital?.contact_number || ''}`, pageWidth / 2, y + 17, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PATHOLOGY LABORATORY REPORT', pageWidth / 2, y + 24, { align: 'center' });
  y += 28;
  doc.setLineWidth(0.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 4;

  // ===== Patient/Report Info Block =====
  doc.setFontSize(9);
  const leftX = marginX;
  const rightX = pageWidth / 2 + 4;
  const labelStyle = (l: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(l, x, yy);
  };
  const valueStyle = (v: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'normal');
    doc.text(v, x, yy);
  };

  let infoY = y;
  labelStyle('Patient Name :', leftX, infoY); valueStyle(data.patientName || '—', leftX + 30, infoY);
  labelStyle('Report No :', rightX, infoY); valueStyle(data.reportNumber, rightX + 24, infoY);
  infoY += 5;
  labelStyle('Patient ID :', leftX, infoY); valueStyle(data.patientId || '—', leftX + 30, infoY);
  labelStyle('Sample Type :', rightX, infoY); valueStyle(data.sampleType || '—', rightX + 24, infoY);
  infoY += 5;
  labelStyle('Age / Sex :', leftX, infoY); valueStyle(`${data.patientAge ?? '—'} / ${data.patientSex || '—'}`, leftX + 30, infoY);
  labelStyle('Instrument :', rightX, infoY); valueStyle(data.instrument || '—', rightX + 24, infoY);
  infoY += 5;
  labelStyle('Phone :', leftX, infoY); valueStyle(data.phone || '—', leftX + 30, infoY);
  labelStyle('Registered :', rightX, infoY); valueStyle(fmt(data.registeredAt), rightX + 24, infoY);
  infoY += 5;
  labelStyle('Referred By :', leftX, infoY); valueStyle(data.referredBy || '—', leftX + 30, infoY);
  labelStyle('Collected :', rightX, infoY); valueStyle(fmt(data.collectedAt), rightX + 24, infoY);
  infoY += 5;
  labelStyle('Collection :', leftX, infoY); valueStyle(data.collectionAddress || '—', leftX + 30, infoY);
  labelStyle('Reported :', rightX, infoY); valueStyle(fmt(data.reportedAt), rightX + 24, infoY);
  infoY += 5;

  y = infoY + 2;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 4;

  // ===== Tests =====
  for (const tt of data.testTypes) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 15;
    }

    if (tt.report_category) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(tt.report_category, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(tt.name.toUpperCase(), marginX, y);
    y += 5;
    if (tt.method) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`Method: ${tt.method}`, marginX, y);
      y += 4;
    }

    // Table header
    const colX = { name: marginX, result: 95, unit: 130, ref: 155 };
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(235, 235, 235);
    doc.rect(marginX, y - 3.5, pageWidth - marginX * 2, 5, 'F');
    doc.text('Parameter', colX.name + 1, y);
    doc.text('Result', colX.result, y);
    doc.text('Unit', colX.unit, y);
    doc.text('Reference Range', colX.ref, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    for (const p of tt.parameters) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 15;
      }
      if (p.category_heading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(p.category_heading, marginX, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
      }

      const flagSuffix = p.flag ? `  (${p.flag})` : '';
      const result = (p.result_value ?? '—') + flagSuffix;
      // Bold result if flagged
      doc.setFont('helvetica', p.flag ? 'bold' : 'normal');
      doc.setTextColor(
        p.flag === 'High' ? 200 : p.flag === 'Low' ? 30 : p.flag === 'Borderline' ? 200 : 0,
        p.flag === 'High' ? 30 : p.flag === 'Low' ? 64 : p.flag === 'Borderline' ? 120 : 0,
        p.flag === 'High' ? 30 : p.flag === 'Low' ? 175 : p.flag === 'Borderline' ? 30 : 0
      );

      doc.text(doc.splitTextToSize(p.parameter_name, 78), colX.name + 1, y);
      doc.text(result, colX.result, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(p.unit || '—', colX.unit, y);
      const refText = p.subrange_used
        ? `${p.subrange_used}: ${p.ref_display || '—'}`
        : (p.ref_display || '—');
      doc.text(doc.splitTextToSize(refText, 50), colX.ref, y);
      y += 5;
    }

    if (tt.notes) {
      y += 2;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(tt.notes, pageWidth - marginX * 2);
      doc.text(noteLines, marginX, y);
      y += noteLines.length * 3.5 + 2;
    }
    y += 3;
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, y, pageWidth - marginX, y);
    doc.setDrawColor(0, 0, 0);
    y += 4;
  }

  // ===== Interpretation =====
  if (data.interpretation) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Interpretation / Notes:', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.interpretation, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4 + 2;
  }

  // ===== Footer =====
  const footerY = pageHeight - 18;
  doc.setLineWidth(0.4);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    `Status: ${data.status === 'final' ? 'FINAL' : 'DRAFT'}   |   Generated: ${formatInPakistanTime(new Date().toISOString(), 'dd-MMM-yyyy hh:mm a')}`,
    marginX,
    footerY + 5
  );
  doc.text('This is a computer-generated report.', pageWidth - marginX, footerY + 5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Signatory', pageWidth - marginX, footerY + 11, { align: 'right' });

  const filename = `Pathology_${data.reportNumber}.pdf`;
  doc.save(filename);
}
