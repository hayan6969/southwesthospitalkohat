
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
  doc.text(`${invoice.patient?.users?.first_name || ''} ${invoice.patient?.users?.last_name || ''}`, 20, 95);
  if (invoice.patient?.users?.email) {
    doc.text(`Email: ${invoice.patient.users.email}`, 20, 105);
  }
  
  // Description
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Description:', 20, 125);
  
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(invoice.description || 'Medical services', 20, 140);
  
  // Amount
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(`Amount: $${invoice.amount}`, 20, 170);
  
  // Due date
  if (invoice.due_date) {
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 190);
  }
  
  // Status
  doc.setFontSize(12);
  doc.text(`Status: ${invoice.status}`, 20, 210);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing our medical services!', 20, 250);
  doc.text('HIMS Medical Center', 20, 260);
  
  // Open PDF in new tab instead of downloading
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
