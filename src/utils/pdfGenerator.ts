
import jsPDF from 'jspdf';

export const generateInvoicePDF = (invoice: any) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('MEDICAL INVOICE', 20, 30);
  
  // Invoice details
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  
  // Invoice number and date
  doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 50);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 60);
  
  // Patient information
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Bill To:', 20, 80);
  
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`${invoice.patient?.users?.first_name} ${invoice.patient?.users?.last_name}`, 20, 95);
  doc.text(`${invoice.patient?.users?.email}`, 20, 105);
  
  // Invoice details
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Invoice Details:', 20, 125);
  
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Description: ${invoice.description}`, 20, 140);
  doc.text(`Amount: $${invoice.amount}`, 20, 150);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 160);
  doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, 20, 170);
  
  // Payment information if paid
  if (invoice.status === 'paid' && invoice.paid_at) {
    doc.text(`Paid on: ${new Date(invoice.paid_at).toLocaleDateString()}`, 20, 180);
  }
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 20, 200);
  doc.text('HIMS by Inostrik', 20, 210);
  
  // Save the PDF
  doc.save(`invoice-${invoice.invoice_number}.pdf`);
};
