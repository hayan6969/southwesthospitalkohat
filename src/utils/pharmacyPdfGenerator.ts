import jsPDF from 'jspdf';
import { formatPkrCurrency } from './currency';
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

// Add hospital header to PDF
const addHospitalHeader = async (pdf: jsPDF, title: string) => {
  const settings = await getHospitalSettings();
  const pageWidth = pdf.internal.pageSize.width;
  let yPosition = 20;

  // Hospital logo (if available)
  if (settings.logo_url) {
    try {
      // Create a new image element to load the logo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Add the logo to PDF (top-left corner)
            pdf.addImage(img, 'JPEG', 20, yPosition - 5, 30, 20);
            resolve(true);
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
            resolve(false);
          }
        };
        img.onerror = () => {
          console.error('Failed to load logo image');
          resolve(false);
        };
        // Set a timeout to avoid hanging
        setTimeout(() => {
          console.warn('Logo loading timeout');
          resolve(false);
        }, 5000);
        img.src = settings.logo_url;
      });
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Hospital name (center-aligned)
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text(`${settings.hospital_name} - Pharmacy`, pageWidth / 2, yPosition + 8, { align: 'center' });
  
  yPosition += 16;
  
  // Hospital address
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text(settings.hospital_address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  
  // Contact number
  pdf.text(`Phone: ${settings.contact_number}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Document title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
  
  return yPosition + 15;
};

export const generatePharmacyInvoicePDF = async (invoiceData: PharmacyInvoiceData): Promise<void> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(pdf, 'PHARMACY INVOICE');
  yPosition += 10;
  
  // Invoice Details Box
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(15, yPosition - 5, pageWidth - 30, 35);
  
  // Invoice Number and Date
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(40, 40, 40);
  pdf.text('Invoice Number:', 20, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoiceData.invoice_number, 80, yPosition + 5);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', 120, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString();
  pdf.text(invoiceDate, 145, yPosition + 5);
  
  // Customer Info
  yPosition += 12;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer:', 20, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  const customerName = invoiceData.customer_name || 'Walk-in Customer';
  pdf.text(customerName, 70, yPosition + 5);
  
  if (invoiceData.customer_phone) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', 120, yPosition + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceData.customer_phone, 155, yPosition + 5);
  }
  
  yPosition += 35;
  
  // Items Table Header
  const tableStartY = yPosition;
  const colWidths = [80, 25, 35, 35];
  const headers = ['Medicine Name', 'Qty', 'Unit Price', 'Total'];
  
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  let xPosition = 20;
  headers.forEach((header, index) => {
    pdf.text(header, xPosition, yPosition + 7);
    xPosition += colWidths[index];
  });
  
  yPosition += 15; // More spacing before first item
  
  // Items
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  invoiceData.items.forEach((item) => {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }
    
    xPosition = 20;
    
    // Medicine name (with text wrapping if too long)
    const medicineName = item.medicine_name.length > 35 
      ? item.medicine_name.substring(0, 32) + '...' 
      : item.medicine_name;
    pdf.text(medicineName, xPosition, yPosition);
    xPosition += colWidths[0];
    
    // Quantity
    pdf.text(item.quantity.toString(), xPosition, yPosition);
    xPosition += colWidths[1];
    
    // Unit Price
    pdf.text(formatPkrCurrency(item.unit_price), xPosition, yPosition);
    xPosition += colWidths[2];
    
    // Total Price
    pdf.text(formatPkrCurrency(item.total_price), xPosition, yPosition);
    
    yPosition += 8;
  });
  
  // Draw table border
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
  
  // Vertical lines for table
  xPosition = 15;
  for (let i = 0; i < colWidths.length - 1; i++) {
    xPosition += colWidths[i];
    pdf.line(xPosition, tableStartY, xPosition, yPosition);
  }
  
  yPosition += 15;
  
  // Totals Section
  const totalsX = pageWidth - 80;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Subtotal:', totalsX - 25, yPosition);
  pdf.text(formatPkrCurrency(invoiceData.total_amount), totalsX, yPosition);
  yPosition += 8;
  
  if (invoiceData.discount_amount && invoiceData.discount_amount > 0) {
    pdf.text('Discount:', totalsX - 25, yPosition);
    pdf.text(`-${formatPkrCurrency(invoiceData.discount_amount)}`, totalsX, yPosition);
    yPosition += 8;
  }
  
  // Final total with border
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(40, 40, 40);
  pdf.rect(totalsX - 40, yPosition - 5, 70, 15);
  pdf.text('Total:', totalsX - 35, yPosition + 4);
  pdf.text(formatPkrCurrency(invoiceData.final_amount), totalsX + 10, yPosition + 4);
  
  yPosition += 25;
  
  // Footer
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  pdf.text('For any queries, please contact us at the above number.', pageWidth / 2, yPosition, { align: 'center' });
  
  // Open PDF in new window
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};