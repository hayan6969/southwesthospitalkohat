import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface RefundSlipItem {
  testName: string;
  price: number;
}

interface RefundSlipData {
  refundNumber: string;
  patientName: string;
  patientNumber: string;
  patientContact?: string | null;
  orderNumber: string;
  items: RefundSlipItem[];
  totalAmount: number;
  refundAmount: number;
  reason: string;
  processedBy: string;
  date: string;
}

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

export const generateRefundSlipPDF = async (data: RefundSlipData): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  const { data: hospital } = await supabase
    .from('hospital_settings')
    .select('hospital_name, contact_number, logo_url')
    .limit(1)
    .maybeSingle();

  // Logo
  const logoUrl = hospital?.logo_url || '/logo.png';
  const logoDataUrl = await loadImageDataUrl(logoUrl);
  if (logoDataUrl) {
    try { pdf.addImage(logoDataUrl, 'PNG', (pageWidth - 30) / 2, y, 30, 30); } catch { /* ignore */ }
    y += 34;
  } else {
    y += 4;
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const hName = hospital?.hospital_name || 'Health Ways Hospital';
  pdf.text(hName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Contact
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const contact = hospital?.contact_number || '0922-860123';
  pdf.text(`Phone: ${contact}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Refund slip title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('REFUND SLIP', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Divider
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Details
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');

  const row = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '—', margin + 40, y);
    y += 5;
  };

  row('Refund #:', data.refundNumber);
  row('Date:', data.date);
  row('Patient:', data.patientName);
  row('Patient ID:', data.patientNumber);
  if (data.patientContact) row('Contact:', data.patientContact);
  row('Order #:', data.orderNumber);

  y += 3;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Items header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Cancelled Tests', margin, y);
  y += 1;
  pdf.setDrawColor(180);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  let itemTotal = 0;
  for (const item of data.items) {
    const price = Number(item.price) || 0;
    pdf.text(`• ${item.testName}`, margin + 2, y);
    pdf.text(
      `Rs. ${price.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      y,
      { align: 'right' }
    );
    itemTotal += price;
    y += 4.5;
  }

  y += 2;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Total and refund
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Total Amount:', margin, y);
  pdf.text(`Rs. ${itemTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  pdf.setTextColor(200, 0, 0);
  pdf.text('Refunded Amount:', margin, y);
  pdf.text(`Rs. ${data.refundAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });
  y += 6;

  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Reason
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Reason:', margin, y);
  pdf.setFont('helvetica', 'normal');
  const reasonLines = pdf.splitTextToSize(data.reason, pageWidth - margin * 2);
  pdf.text(reasonLines, margin, y + 4);
  y += reasonLines.length * 4 + 8;

  // Processed by
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.text(`Processed by: ${data.processedBy}`, margin, y);
  y += 5;

  // Signature
  pdf.setFont('helvetica', 'normal');
  pdf.text("Authorised Signatory", pageWidth - margin, y, { align: 'right' });
  pdf.line(pageWidth - margin - 40, y + 1, pageWidth - margin, y + 1);

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
