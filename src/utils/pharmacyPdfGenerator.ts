import jsPDF from 'jspdf';
import { formatPkrCurrency } from './currency';

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

export const generatePharmacyInvoicePDF = (invoiceData: PharmacyInvoiceData): void => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PHARMACY INVOICE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Hospital/Pharmacy Info
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Health Nexus Pharmacy', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  pdf.text('123 Medical Street, Healthcare City', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  pdf.text('Phone: +92 300 1234567', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Invoice Details Box
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(15, yPosition - 5, pageWidth - 30, 25);
  
  // Invoice Number and Date
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Invoice Number:', 20, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoiceData.invoice_number, 65, yPosition + 5);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', 120, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString();
  pdf.text(invoiceDate, 140, yPosition + 5);
  
  // Customer Info
  yPosition += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Name:', 20, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  const customerName = invoiceData.customer_name || 'Walk-in Customer';
  pdf.text(customerName, 65, yPosition + 5);
  
  if (invoiceData.customer_phone) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Phone:', 120, yPosition + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceData.customer_phone, 140, yPosition + 5);
  }
  
  yPosition += 25;
  
  // Items Table Header
  const tableStartY = yPosition;
  const colWidths = [80, 25, 35, 35];
  const headers = ['Medicine Name', 'Qty', 'Unit Price', 'Total'];
  
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  let xPosition = 20;
  headers.forEach((header, index) => {
    pdf.text(header, xPosition, yPosition + 7);
    xPosition += colWidths[index];
  });
  
  yPosition += 12;
  
  // Items
  pdf.setFont('helvetica', 'normal');
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
  pdf.rect(totalsX - 30, yPosition - 5, 50, 12);
  pdf.text('Total:', totalsX - 25, yPosition + 3);
  pdf.text(formatPkrCurrency(invoiceData.final_amount), totalsX, yPosition + 3);
  
  yPosition += 25;
  
  // Footer
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  pdf.text('For any queries, please contact us at the above number.', pageWidth / 2, yPosition, { align: 'center' });
  
  // Open PDF in new window
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};