
import jsPDF from 'jspdf';
import { formatPkrAmount } from './currency';

// Lab invoice generation
export const generateLabInvoicePDF = async (data: {
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  tests: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  totalAmount: number;
  issueDate: string;
}) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Lab Test Invoice', 20, 20);

  // Invoice details
  doc.setFontSize(12);
  doc.text(`Invoice Number: ${data.invoiceNumber}`, 20, 40);
  doc.text(`Date: ${data.issueDate}`, 20, 50);
  doc.text(`Patient: ${data.patientName}`, 20, 60);
  doc.text(`Email: ${data.patientEmail}`, 20, 70);

  // Tests table
  let yPosition = 90;
  doc.setFontSize(14);
  doc.text('Lab Tests Ordered:', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.text('Test Name', 20, yPosition);
  doc.text('Price', 150, yPosition);
  yPosition += 5;

  // Draw line
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // Test items
  data.tests.forEach((test) => {
    doc.text(test.name, 20, yPosition);
    doc.text(`PKR ${test.price.toFixed(2)}`, 150, yPosition);
    if (test.description) {
      yPosition += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(test.description, 25, yPosition);
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
    }
    yPosition += 10;
  });

  // Total
  yPosition += 10;
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;
  doc.setFontSize(12);
  doc.text(`Total Amount: PKR ${data.totalAmount.toFixed(2)}`, 20, yPosition);

  // Footer
  yPosition += 30;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Please bring this invoice when coming for your lab tests.', 20, yPosition);
  doc.text('Payment is due before test collection.', 20, yPosition + 10);

  return doc.output('blob');
};

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
  doc.text(`Amount: ${formatPkrAmount(invoice.amount)}`, 20, 170);
  
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

export const generateOTPDF = (data: {
  invoiceNumber: string;
  patientName: string;
  doctorName: string;
  procedure: string;
  room: string;
  date: string;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) => {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('OT OPERATION INVOICE', 20, 30);
  
  // Invoice details
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  
  // Invoice number and date
  doc.text(`Invoice #: ${data.invoiceNumber}`, 20, 50);
  doc.text(`Date: ${data.date}`, 20, 60);
  
  // Patient information
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Patient Information:', 20, 80);
  
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Patient: ${data.patientName}`, 20, 95);
  doc.text(`Doctor: ${data.doctorName}`, 20, 105);
  doc.text(`Procedure: ${data.procedure}`, 20, 115);
  doc.text(`OT Room: ${data.room}`, 20, 125);
  
  // Items table header
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Operation Details:', 20, 145);
  
  // Table headers
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Description', 20, 160);
  doc.text('Qty', 120, 160);
  doc.text('Unit Price', 140, 160);
  doc.text('Total', 170, 160);
  
  // Draw line under headers
  doc.line(20, 165, 190, 165);
  
  // Items
  let yPosition = 175;
  data.items.forEach((item) => {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(item.description, 20, yPosition);
    doc.text(item.quantity.toString(), 120, yPosition);
    doc.text(formatPkrAmount(item.unitPrice), 140, yPosition);
    doc.text(formatPkrAmount(item.totalPrice), 170, yPosition);
    yPosition += 10;
  });
  
  // Total line
  yPosition += 10;
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;
  
  // Total amount
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total Amount: ${formatPkrAmount(data.totalAmount)}`, 20, yPosition);
  
  // Footer
  yPosition += 30;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing our medical services!', 20, yPosition);
  doc.text('HIMS Medical Center - OT Department', 20, yPosition + 10);
  doc.text('This invoice serves as proof of completed operation.', 20, yPosition + 20);
  
  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
