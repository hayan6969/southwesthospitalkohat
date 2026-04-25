import jsPDF from 'jspdf';
import { formatPkrAmount } from './currency';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PharmacyInvoiceData {
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  discount_amount?: number;
  final_amount: number;
  created_at: string;
  items: InvoiceItem[];
}

// Get hospital settings for PDF branding
const getHospitalSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('hospital_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching hospital settings:', error);
    return {
      hospital_name: 'Medical Center',
      hospital_address: 'Healthcare District',
      contact_number: '+92-XXX-XXXXXXX',
      logo_url: null,
    };
  }
};

// 80mm thermal printer receipt generator
export const generatePharmacyInvoicePDF = async (
  invoiceData: PharmacyInvoiceData
): Promise<void> => {
  const settings = await getHospitalSettings();

  // 80mm paper width - printable area typically ~72mm
  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  const centerX = pageWidth / 2;

  // Estimate page height dynamically based on items
  const baseHeight = 110;
  const perItemHeight = 10;
  const pageHeight = baseHeight + invoiceData.items.length * perItemHeight;

  const pdf = new jsPDF({
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  let y = 5;

  // Logo (small, centered)
  if (settings.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => {
          try {
            const logoSize = 14;
            pdf.addImage(img, 'JPEG', centerX - logoSize / 2, y, logoSize, logoSize);
            resolve(true);
          } catch {
            resolve(false);
          }
        };
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
        img.src = settings.logo_url;
      });
      y += 16;
    } catch {
      // skip logo
    }
  }

  // Hospital Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  const nameLines = pdf.splitTextToSize(
    `${settings.hospital_name} - Pharmacy`,
    contentWidth
  );
  nameLines.forEach((line: string) => {
    pdf.text(line, centerX, y, { align: 'center' });
    y += 4.5;
  });

  // Address
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const addrLines = pdf.splitTextToSize(settings.hospital_address || '', contentWidth);
  addrLines.forEach((line: string) => {
    pdf.text(line, centerX, y, { align: 'center' });
    y += 3.2;
  });

  // Phone
  pdf.text(`Tel: ${settings.contact_number || ''}`, centerX, y, { align: 'center' });
  y += 4;

  // Divider
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Receipt title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('PHARMACY INVOICE', centerX, y, { align: 'center' });
  y += 4;

  // Invoice meta
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(`Invoice #: ${invoiceData.invoice_number}`, margin, y);
  y += 3.5;

  const invoiceDate = new Date(invoiceData.created_at).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.text(`Date: ${invoiceDate}`, margin, y);
  y += 3.5;

  pdf.text(
    `Customer: ${invoiceData.customer_name || 'Walk-in Customer'}`,
    margin,
    y
  );
  y += 3.5;

  if (invoiceData.customer_phone) {
    const phone = invoiceData.customer_phone.replace(/[^0-9+]/g, '');
    pdf.text(`Phone: ${phone}`, margin, y);
    y += 3.5;
  }

  // Divider
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('Item', margin, y);
  pdf.text('Qty', margin + 38, y, { align: 'right' });
  pdf.text('Price', margin + 52, y, { align: 'right' });
  pdf.text('Total', pageWidth - margin, y, { align: 'right' });
  y += 2;
  pdf.setLineWidth(0.1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items
  pdf.setFont('helvetica', 'normal');
  invoiceData.items.forEach((item) => {
    // Wrap medicine name within ~36mm
    const nameLines = pdf.splitTextToSize(item.medicine_name, 36);

    // First line carries qty/price/total
    pdf.text(nameLines[0], margin, y);
    pdf.text(String(item.quantity), margin + 38, y, { align: 'right' });
    pdf.text(formatPkrAmount(item.unit_price), margin + 52, y, { align: 'right' });
    pdf.text(formatPkrAmount(item.total_price), pageWidth - margin, y, {
      align: 'right',
    });
    y += 3.5;

    // Remaining wrapped name lines
    for (let i = 1; i < nameLines.length; i++) {
      pdf.text(nameLines[i], margin, y);
      y += 3.2;
    }
    y += 1;
  });

  // Divider
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Totals
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Subtotal:', margin, y);
  pdf.text(formatPkrAmount(invoiceData.total_amount), pageWidth - margin, y, {
    align: 'right',
  });
  y += 4;

  if (invoiceData.discount_amount && invoiceData.discount_amount > 0) {
    pdf.text('Discount:', margin, y);
    pdf.text(
      `-${formatPkrAmount(invoiceData.discount_amount)}`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );
    y += 4;
  }

  pdf.line(margin, y - 2, pageWidth - margin, y - 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('TOTAL:', margin, y + 1);
  pdf.text(formatPkrAmount(invoiceData.final_amount), pageWidth - margin, y + 1, {
    align: 'right',
  });
  y += 6;

  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Payment: Cash', centerX, y, { align: 'center' });
  y += 4;

  pdf.setFont('helvetica', 'italic');
  pdf.text('Thank you for your visit!', centerX, y, { align: 'center' });
  y += 3.2;
  pdf.text('Get well soon.', centerX, y, { align: 'center' });

  // Open PDF in a new window for printing
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
