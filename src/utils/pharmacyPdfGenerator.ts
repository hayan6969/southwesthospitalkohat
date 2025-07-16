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
      logo_url: null
    };
  }
};

// Add hospital header to thermal receipt
const addThermalHeader = async (pdf: jsPDF, title: string) => {
  const settings = await getHospitalSettings();
  const pageWidth = pdf.internal.pageSize.width;
  let yPosition = 10;

  // Hospital name (center-aligned)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text(`${settings.hospital_name}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  
  // Hospital address
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text(settings.hospital_address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  
  // Contact number
  pdf.text(`Phone: ${settings.contact_number}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  
  // Separator line
  pdf.setDrawColor(0, 0, 0);
  pdf.line(5, yPosition, pageWidth - 5, yPosition);
  
  yPosition += 8;
  
  // Document title
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
  
  return yPosition + 10;
};

export const generatePharmacyInvoicePDF = async (invoiceData: PharmacyInvoiceData): Promise<void> => {
  // Create PDF with thermal receipt dimensions (80mm width)
  const pdf = new jsPDF({
    unit: 'mm',
    format: [80, 200], // 80mm width, adjustable height
    orientation: 'portrait'
  });
  
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 3;

  // Add hospital header
  let yPosition = await addThermalHeader(pdf, 'PHARMACY RECEIPT');
  
  // Separator line
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Invoice Details (stacked vertically for narrow format)
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  
  // Invoice Number
  pdf.text('Invoice #:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoiceData.invoice_number, margin + 20, yPosition);
  yPosition += 5;
  
  // Date
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString();
  pdf.text(invoiceDate, margin + 15, yPosition);
  yPosition += 5;
  
  // Customer
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer:', margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  const customerName = invoiceData.customer_name || 'Walk-in Customer';
  // Split long customer names across lines
  if (customerName.length > 20) {
    const words = customerName.split(' ');
    let line1 = '';
    let line2 = '';
    let currentLength = 0;
    
    for (const word of words) {
      if (currentLength + word.length < 20) {
        line1 += (line1 ? ' ' : '') + word;
        currentLength += word.length + 1;
      } else {
        line2 += (line2 ? ' ' : '') + word;
      }
    }
    
    pdf.text(line1, margin + 20, yPosition);
    if (line2) {
      yPosition += 4;
      pdf.text(line2, margin + 20, yPosition);
    }
  } else {
    pdf.text(customerName, margin + 20, yPosition);
  }
  yPosition += 5;
  
  // Contact
  if (invoiceData.customer_phone) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceData.customer_phone, margin + 15, yPosition);
    yPosition += 5;
  }
  
  yPosition += 3;
  
  // Separator line before items
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Items Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('ITEM', margin, yPosition);
  pdf.text('QTY', pageWidth - 45, yPosition);
  pdf.text('RATE', pageWidth - 30, yPosition);
  pdf.text('TOTAL', pageWidth - 15, yPosition);
  yPosition += 3;
  
  // Separator line after header
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;
  
  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(60, 60, 60);
  
  invoiceData.items.forEach((item) => {
    // Medicine name (wrap if too long)
    const maxNameLength = 25;
    let medicineName = item.medicine_name;
    
    if (medicineName.length > maxNameLength) {
      // Split into multiple lines
      const words = medicineName.split(' ');
      let line1 = '';
      let line2 = '';
      let currentLength = 0;
      
      for (const word of words) {
        if (currentLength + word.length < maxNameLength) {
          line1 += (line1 ? ' ' : '') + word;
          currentLength += word.length + 1;
        } else {
          line2 += (line2 ? ' ' : '') + word;
        }
      }
      
      pdf.text(line1, margin, yPosition);
      if (line2) {
        yPosition += 3;
        pdf.text(line2.length > maxNameLength ? line2.substring(0, maxNameLength - 3) + '...' : line2, margin, yPosition);
      }
    } else {
      pdf.text(medicineName, margin, yPosition);
    }
    
    // Quantity, Rate, Total (right aligned) - remove PKR prefix for individual items
    pdf.text(item.quantity.toString(), pageWidth - 45, yPosition);
    pdf.text(item.unit_price.toFixed(0), pageWidth - 30, yPosition);
    pdf.text(item.total_price.toFixed(0), pageWidth - 15, yPosition);
    
    yPosition += 5;
  });
  
  // Separator line before totals
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Totals Section
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  
  // Subtotal
  pdf.text('Subtotal:', margin, yPosition);
  pdf.text(formatPkrAmount(invoiceData.total_amount), pageWidth - 25, yPosition);
  yPosition += 4;
  
  // Discount (if any)
  if (invoiceData.discount_amount && invoiceData.discount_amount > 0) {
    pdf.text('Discount:', margin, yPosition);
    pdf.text(`-${formatPkrAmount(invoiceData.discount_amount)}`, pageWidth - 25, yPosition);
    yPosition += 4;
  }
  
  // Grand Total
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  pdf.text('TOTAL:', margin, yPosition);
  pdf.text(formatPkrAmount(invoiceData.final_amount), pageWidth - 25, yPosition);
  
  yPosition += 8;
  
  // Separator line before footer
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  pdf.text('Visit again soon!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  // Current time
  const currentTime = new Date().toLocaleString();
  pdf.text(`Printed: ${currentTime}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Open PDF in new window directly (simplified approach)
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Open in new tab/window
  const newWindow = window.open(pdfUrl, '_blank');
  
  if (!newWindow) {
    // If popup was blocked, try alternative method
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.download = `pharmacy-invoice-${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL after download
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
  } else {
    // Clean up URL after a delay when opened in new window
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 10000);
  }
};