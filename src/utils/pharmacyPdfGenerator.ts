
import jsPDF from 'jspdf';

export const generatePharmacyInvoicePDF = (invoice: any) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('PHARMACY INVOICE', 20, 30);
  
  // Invoice details
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  
  // Invoice number and date
  doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 50);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 60);
  
  // Customer information
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Bill To:', 20, 80);
  
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`${invoice.customer_name || 'Walk-in Customer'}`, 20, 95);
  if (invoice.customer_phone) {
    doc.text(`Phone: ${invoice.customer_phone}`, 20, 105);
  }
  
  // Items header
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Items:', 20, 125);
  
  // Table headers
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Medicine', 20, 140);
  doc.text('Qty', 100, 140);
  doc.text('Unit Price', 130, 140);
  doc.text('Total', 170, 140);
  
  // Draw header line
  doc.line(20, 142, 190, 142);
  
  // Items
  let yPosition = 155;
  if (invoice.pharmacy_invoice_items) {
    invoice.pharmacy_invoice_items.forEach((item: any) => {
      doc.text(item.medicines?.name || 'Medicine', 20, yPosition);
      doc.text(item.quantity.toString(), 100, yPosition);
      doc.text(`$${item.unit_price.toFixed(2)}`, 130, yPosition);
      doc.text(`$${item.total_price.toFixed(2)}`, 170, yPosition);
      yPosition += 10;
    });
  }
  
  // Draw line before totals
  doc.line(20, yPosition + 5, 190, yPosition + 5);
  
  // Totals
  yPosition += 15;
  doc.setFontSize(12);
  doc.text(`Subtotal: $${invoice.total_amount.toFixed(2)}`, 130, yPosition);
  
  if (invoice.discount_amount > 0) {
    yPosition += 10;
    doc.text(`Discount: -$${invoice.discount_amount.toFixed(2)}`, 130, yPosition);
  }
  
  yPosition += 10;
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total: $${invoice.final_amount.toFixed(2)}`, 130, yPosition);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 20, yPosition + 30);
  doc.text('HIMS Pharmacy', 20, yPosition + 40);
  
  // Open PDF in new tab instead of downloading
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
