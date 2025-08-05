
import jsPDF from 'jspdf';
import { formatPkrAmount } from './currency';
import { supabase } from '@/integrations/supabase/client';
import { getPatientContactNumber } from './patientUtils';

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
const addHospitalHeader = async (doc: jsPDF, title: string) => {
  const settings = await getHospitalSettings();
  const pageWidth = doc.internal.pageSize.width;
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
            doc.addImage(img, 'JPEG', 20, yPosition - 5, 30, 20);
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
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(settings.hospital_name, pageWidth / 2, yPosition + 8, { align: 'center' });
  
  yPosition += 16;
  
  // Hospital address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(settings.hospital_address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  
  // Contact number
  doc.text(`Phone: ${settings.contact_number}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Document title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  
  return yPosition + 15;
};

// Lab invoice generation
export const generateLabInvoicePDF = async (data: {
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  patientId?: string;
  patientPhone?: string;
  tests: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  totalAmount: number;
  issueDate: string;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(doc, 'LAB TEST INVOICE');
  yPosition += 10;

  // Invoice details box (exactly like staff dashboard)
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition - 5, pageWidth - 30, 50);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice #:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.issueDate, 140, yPosition + 5);
  
  yPosition += 10;
  
  // Second row
  doc.setFont('helvetica', 'bold');
  doc.text('Patient:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientId || 'N/A', 160, yPosition + 5);
  
  yPosition += 10;
  
  // Third row
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPLETED', 60, yPosition + 5);

  yPosition += 50;

  // Tests table
  const tableStartY = yPosition;
  const colWidths = [100, 40, 40];
  const headers = ['Test Name', 'Description', 'Price'];
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  let xPosition = 20;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition + 7);
    xPosition += colWidths[index];
  });
  
  yPosition += 15; // More spacing before first item
  
  // Test items with proper text wrapping
  doc.setFont('helvetica', 'normal');
  data.tests.forEach((test) => {
    xPosition = 20;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Test name with text wrapping
    const testNameLines = doc.splitTextToSize(test.name, colWidths[0] - 5);
    const testNameHeight = testNameLines.length * 5;
    
    // Description with text wrapping
    const description = test.description || '-';
    const descLines = doc.splitTextToSize(description, colWidths[1] - 5);
    const descHeight = descLines.length * 5;
    
    // Calculate row height based on the tallest cell content
    const rowHeight = Math.max(testNameHeight, descHeight, 8);
    
    // Test name (wrapped)
    doc.text(testNameLines, xPosition, yPosition);
    xPosition += colWidths[0];
    
    // Description (wrapped)
    doc.text(descLines, xPosition, yPosition);
    xPosition += colWidths[1];
    
    // Price (aligned to top of row)
    doc.text(formatPkrAmount(test.price), xPosition, yPosition);
    
    yPosition += rowHeight + 2; // Add some padding between rows
  });
  
  // Draw table border
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
  
  // Vertical lines for table
  xPosition = 15;
  for (let i = 0; i < colWidths.length - 1; i++) {
    xPosition += colWidths[i];
    doc.line(xPosition, tableStartY, xPosition, yPosition);
  }

  yPosition += 15;

  // Total section
  yPosition += 15;
  const totalsX = pageWidth - 85; // Position box from right edge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.rect(totalsX, yPosition - 5, 80, 18); // Wider box for better fit
  doc.text('Total Amount:', totalsX + 5, yPosition + 4); // Text starts inside box
  doc.text(formatPkrAmount(data.totalAmount), totalsX + 5, yPosition + 12); // Amount below label

  // Footer
  yPosition += 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Please bring this invoice when coming for your lab tests.', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('Payment is due before test collection.', pageWidth / 2, yPosition + 8, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  
  return pdfBlob;
};

export const generateInvoicePDF = async (invoice: any) => {
  console.log('generateInvoicePDF called with:', JSON.stringify(invoice, null, 2));
  console.log('invoice.patient structure:', invoice.patient);
  console.log('invoice.patient?.patient_number:', invoice.patient?.patient_number);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(doc, 'MEDICAL INVOICE');
  yPosition += 10;

  // Invoice details in a comprehensive box - made taller for CNIC
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition - 5, pageWidth - 30, 60); // Increased height for CNIC field
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice Number:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.created_at).toLocaleDateString(), 135, yPosition + 5);
  
  yPosition += 10;
  // Handle both old structure (patient.users) and new structure (patient.profiles)
  const patientProfile = invoice.patient?.profiles || invoice.patient?.users;
  const invoicePatientName = patientProfile ? 
    `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 
    (invoice.patient_name || 'Patient');
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Name:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoicePatientName, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.patient?.patient_number || 'N/A', 160, yPosition + 5);
  
  // Third row - Get contact information from the correct profile structure
  yPosition += 10;
  const patientProfileForContact = invoice.patient?.profiles || invoice.patient?.users;
  const phoneNumber = getPatientContactNumber(invoice.patient, patientProfileForContact);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Contact:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(phoneNumber, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.status, 155, yPosition + 5);
  
  // Fourth row - Add CNIC if available (for emergency consultations)
  if (invoice.patient?.cnic) {
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('CNIC:', 20, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.patient.cnic, 50, yPosition + 5);
  }
  
  // Fifth row (if due date exists) - adjusted for CNIC addition
  if (invoice.due_date) {
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', 20, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoice.due_date).toLocaleDateString(), 65, yPosition + 5);
  }

  yPosition += 60; // Adjusted for larger info box

  // Services table
  const tableStartY = yPosition;
  const colWidths = [120, 60];
  const headers = ['Description', 'Amount'];
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  let xPosition = 20;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition + 7);
    xPosition += colWidths[index];
  });
  
  yPosition += 15; // More spacing before first item
  
  // Service item
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  xPosition = 20;
  
  const description = invoice.description || 'Medical services';
  doc.text(description, xPosition, yPosition);
  xPosition += colWidths[0];
  
  doc.text(formatPkrAmount(invoice.amount), xPosition, yPosition);
  
  yPosition += 8;
  
  // Draw table border
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
  
  // Vertical line for table
  doc.line(15 + colWidths[0], tableStartY, 15 + colWidths[0], yPosition);

  yPosition += 15;

  // Total section
  yPosition += 15;
  const totalsX = pageWidth - 85; // Position box from right edge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.rect(totalsX, yPosition - 5, 80, 18); // Wider box for better fit
  doc.text('Total Amount:', totalsX + 5, yPosition + 4); // Text starts inside box
  doc.text(formatPkrAmount(invoice.amount), totalsX + 5, yPosition + 12); // Amount below label

  // Footer
  yPosition += 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

// X-ray invoice generation
export const generateXrayInvoicePDF = async (data: {
  invoiceNumber: string;
  patientName: string;
  patientEmail: string;
  patientId?: string;
  patientPhone?: string;
  doctorName?: string;
  tests: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  totalAmount: number;
  issueDate: string;
  xrayDate: string;
  notes?: string;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(doc, 'X-RAY EXAMINATION INVOICE');
  yPosition += 10;

  // Invoice details box
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition - 5, pageWidth - 30, 60);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice #:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Date:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.issueDate, 160, yPosition + 5);
  
  yPosition += 10;
  
  // Second row
  doc.setFont('helvetica', 'bold');
  doc.text('Patient:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientId || 'N/A', 160, yPosition + 5);
  
  yPosition += 10;
  
  // Third row
  doc.setFont('helvetica', 'bold');
  doc.text('X-ray Date:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.xrayDate, 70, yPosition + 5);
  
  if (data.doctorName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Doctor:', 120, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.doctorName, 150, yPosition + 5);
  }
  
  yPosition += 10;
  
  // Fourth row - Status
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('SCHEDULED', 60, yPosition + 5);

  yPosition += 65;

  // Tests table
  const tableStartY = yPosition;
  const colWidths = [100, 40, 40];
  const headers = ['X-ray Test', 'Description', 'Price'];
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition, pageWidth - 30, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  let xPosition = 20;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition + 7);
    xPosition += colWidths[index];
  });
  
  yPosition += 15;
  
  // Test items
  doc.setFont('helvetica', 'normal');
  data.tests.forEach((test) => {
    xPosition = 20;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    const testNameLines = doc.splitTextToSize(test.name, colWidths[0] - 5);
    const testNameHeight = testNameLines.length * 5;
    
    const description = test.description || '-';
    const descLines = doc.splitTextToSize(description, colWidths[1] - 5);
    const descHeight = descLines.length * 5;
    
    const rowHeight = Math.max(testNameHeight, descHeight, 8);
    
    doc.text(testNameLines, xPosition, yPosition);
    xPosition += colWidths[0];
    
    doc.text(descLines, xPosition, yPosition);
    xPosition += colWidths[1];
    
    doc.text(formatPkrAmount(test.price), xPosition, yPosition);
    
    yPosition += rowHeight + 2;
  });
  
  // Draw table border
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
  
  // Vertical lines for table
  xPosition = 15;
  for (let i = 0; i < colWidths.length - 1; i++) {
    xPosition += colWidths[i];
    doc.line(xPosition, tableStartY, xPosition, yPosition);
  }

  yPosition += 15;

  // Notes section if available
  if (data.notes) {
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Notes:', 20, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(notesLines, 20, yPosition);
    yPosition += notesLines.length * 5 + 10;
  }

  // Total section
  yPosition += 15;
  const totalsX = pageWidth - 85;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.rect(totalsX, yPosition - 5, 80, 18);
  doc.text('Total Amount:', totalsX + 5, yPosition + 4);
  doc.text(formatPkrAmount(data.totalAmount), totalsX + 5, yPosition + 12);

  // Footer
  yPosition += 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Please arrive 15 minutes before your scheduled X-ray appointment.', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('Payment is required before the examination.', pageWidth / 2, yPosition + 8, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  
  return pdfBlob;
};

export const generateOTPDF = async (data: {
  invoiceNumber: string;
  patientName: string;
  patientId?: string;
  patientPhone?: string;
  doctorName: string;
  procedure: string;
  room: string;
  date: string;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice: number | string;
    isHeader?: boolean;
  }>;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(doc, 'OT OPERATION INVOICE');
  yPosition += 5; // Reduced spacing

  // Invoice details in a more compact box
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition, pageWidth - 30, 45); // Reduced height
  
  doc.setFontSize(10); // Smaller font
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice #:', 20, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 55, yPosition + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 140, yPosition + 8);
  
  // Second row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Patient:', 20, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 50, yPosition + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('ID:', 120, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientId || 'N/A', 135, yPosition + 8);
  
  // Third row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Doctor:', 20, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.doctorName, 50, yPosition + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Room:', 120, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.room, 140, yPosition + 8);
  
  // Fourth row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Procedure:', 20, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.procedure.length > 50 ? data.procedure.substring(0, 47) + '...' : data.procedure, 60, yPosition + 8);

  yPosition += 50; // Move to table start

  // Items table with better spacing
  const tableStartY = yPosition;
  const colWidths = [80, 25, 35, 35]; // Adjusted column widths
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  
  // Table header with better styling
  doc.setFillColor(230, 230, 230);
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition, pageWidth - 30, 8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  let xPosition = 20;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition + 6);
    xPosition += colWidths[index];
  });
  
  yPosition += 8;
  
  // Items with controlled spacing
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  
  let itemsAdded = 0;
  const maxItems = 20; // Limit items to ensure single page
  
  data.items.forEach((item, index) => {
    if (itemsAdded >= maxItems) return; // Skip if too many items
    
    xPosition = 20;
    
    if (item.isHeader) {
      // Header styling - more compact
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(8);
      doc.text(item.description, xPosition, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
    } else {
      // Description
      const description = item.description.length > 45 ? item.description.substring(0, 42) + '...' : item.description;
      doc.text(description, xPosition, yPosition + 5);
      xPosition += colWidths[0];
      
      // Quantity
      doc.text(item.quantity.toString(), xPosition + 5, yPosition + 5);
      xPosition += colWidths[1];
      
      // Unit Price
      doc.text(formatPkrAmount(Number(item.unitPrice)), xPosition, yPosition + 5);
      xPosition += colWidths[2];
      
      // Total Price
      doc.text(formatPkrAmount(Number(item.totalPrice)), xPosition, yPosition + 5);
    }
    
    yPosition += 6; // Reduced line height for more compact layout
    itemsAdded++;
  });
  
  // Table border
  const tableEndY = yPosition;
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, tableStartY, pageWidth - 30, tableEndY - tableStartY);
  
  // Vertical lines for table columns
  xPosition = 15;
  for (let i = 0; i < colWidths.length - 1; i++) {
    xPosition += colWidths[i];
    doc.line(xPosition, tableStartY, xPosition, tableEndY);
  }
  
  // Horizontal line after header
  doc.line(15, tableStartY + 8, pageWidth - 15, tableStartY + 8);

  yPosition += 10;

  // Total section - clean and prominent but compact
  const totalBoxWidth = 70;
  const totalBoxHeight = 15;
  const totalsX = pageWidth - totalBoxWidth - 15;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // Total box with border
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.rect(totalsX, yPosition, totalBoxWidth, totalBoxHeight, 'FD');
  
  // Total text
  doc.setFontSize(10);
  doc.text('TOTAL AMOUNT:', totalsX + 3, yPosition + 6);
  doc.setFontSize(12);
  doc.setTextColor(0, 100, 0);
  doc.text(formatPkrAmount(data.totalAmount), totalsX + 3, yPosition + 12);

  // Footer - compact
  yPosition += 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('This invoice serves as proof of completed operation.', pageWidth / 2, yPosition + 6, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

// Generate daily closing PDF
export const generateDailyClosingPDF = async (data: {
  closingDate: string;
  closingTime: string;
  dayName: string;
  hospitalRevenue: number;
  pharmacyRevenue: number;
  pharmacyProfit: number;
  totalExpenses: number;
  totalRefunds: number;
  netProfit: number;
  transactionsData: any;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // ===========================================
  // CLOSING BALANCE SECTION (AT TOP)
  // ===========================================
  
  // Get the latest closing balance (single updatable value)
  const { data: latestBalance } = await supabase
    .from('hospital_closing_balance')
    .select('closing_balance')
    .order('closing_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousClosingBalance = latestBalance?.closing_balance || 0;

  // Add header
  await addHospitalHeader(doc, 'Daily Financial Closing Report');
  yPosition += 60;

  // Display opening balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 150);
  doc.text('OPENING BALANCE', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(`Previous Day's Closing Balance: ${formatPkrAmount(previousClosingBalance)}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // Date and Day information with proper formatting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(`${data.dayName}, ${new Date(data.closingDate).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Closing Time: ${new Date(data.closingTime).toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 25;

  // Helper function to check if new page is needed
  const checkNewPage = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper function to draw section header
  const drawSectionHeader = (title: string) => {
    checkNewPage(25);
    
    // Draw background for section header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 2, pageWidth - 30, 12, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPosition - 2, pageWidth - 30, 12);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(title, pageWidth / 2, yPosition + 6, { align: 'center' });
    yPosition += 15;
  };

  // Helper function to draw subsection header
  const drawSubHeader = (title: string) => {
    checkNewPage(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(title, 20, yPosition);
    yPosition += 8;
  };

  // Helper function to draw professional tables with proper page breaks
  const drawTable = (headers: string[], rows: string[][], colWidths: number[], startX: number = 20) => {
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const headerHeight = 10;
    const rowHeight = 8;
    const maxRowsPerPage = Math.floor((pageHeight - yPosition - 40) / rowHeight);
    
    let currentRows = [...rows];
    let isFirstPage = true;
    
    while (currentRows.length > 0) {
      // Check if we need a new page (only for subsequent tables)
      if (!isFirstPage) {
        checkNewPage(headerHeight + rowHeight + 10);
      } else {
        // For first page, ensure we have space for header + at least 2 rows
        checkNewPage(headerHeight + (2 * rowHeight) + 10);
      }
      
      const availableRows = Math.floor((pageHeight - yPosition - 40) / rowHeight) - 1; // -1 for header
      const rowsToRender = Math.min(currentRows.length, availableRows);
      const pageRows = currentRows.splice(0, rowsToRender);
      
      let tableY = yPosition;
      
      // Draw header background
      doc.setFillColor(50, 50, 50);
      doc.rect(startX, tableY, tableWidth, headerHeight, 'F');
      
      // Draw header text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      
      let xPos = startX + 2;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableY + 7);
        xPos += colWidths[i];
      });
      
      tableY += headerHeight;
      
      // Draw rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      
      pageRows.forEach((row, rowIndex) => {
        // Skip if we're running out of space
        if (tableY + rowHeight > pageHeight - 20) {
          return;
        }
        
        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
        }
        
        xPos = startX + 2;
        row.forEach((cell, colIndex) => {
          // Truncate long text to fit in column
          let displayText = cell;
          if (typeof cell === 'string' && cell.length > 20 && !cell.includes('Rs.')) {
            displayText = cell.substring(0, 17) + '...';
          }
          
          // Right align numeric values (amounts)
          if (cell.includes('Rs.') || cell.includes('(') || !isNaN(parseFloat(cell))) {
            doc.text(displayText, xPos + colWidths[colIndex] - 4, tableY + 6, { align: 'right' });
          } else {
            doc.text(displayText, xPos, tableY + 6);
          }
          xPos += colWidths[colIndex];
        });
        
        tableY += rowHeight;
      });
      
      // Draw table border
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(startX, yPosition, tableWidth, tableY - yPosition);
      
      // Draw column lines
      xPos = startX;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        doc.line(xPos, yPosition, xPos, tableY);
      }
      
      // Draw horizontal lines
      for (let i = 0; i <= pageRows.length; i++) {
        const lineY = yPosition + headerHeight + (i * rowHeight);
        doc.line(startX, lineY, startX + tableWidth, lineY);
      }
      
      yPosition = tableY + 10; // Reduced spacing after table
      isFirstPage = false;
    }
    
    return yPosition;
  };

  // ===========================================
  // PHARMACY SECTION
  // ===========================================
  drawSectionHeader('PHARMACY TRANSACTIONS');

  // Pharmacy Sales Table
  if (data.transactionsData?.pharmacyInvoices?.length > 0) {
    drawSubHeader('Sales Transactions');

    const pharmacyHeaders = ['Invoice No.', 'Customer Name', 'Items Count', 'Total Amount'];
    const pharmacyColWidths = [40, 60, 30, 40];
    const pharmacyRows: string[][] = [];

    data.transactionsData.pharmacyInvoices.forEach((invoice: any) => {
      const customerName = invoice.customer_name || 'Walk-in Customer';
      const itemsCount = invoice.pharmacy_invoice_items?.length || 0;
      
      pharmacyRows.push([
        invoice.invoice_number,
        customerName,
        `${itemsCount} items`,
        formatPkrAmount(invoice.final_amount)
      ]);
    });

    drawTable(pharmacyHeaders, pharmacyRows, pharmacyColWidths);
    
    // Medicine Details Table
    drawSubHeader('Medicine Sales Detail');

    const itemHeaders = ['Medicine Name', 'Quantity', 'Unit Price', 'Total Price'];
    const itemColWidths = [80, 25, 30, 35];
    const itemRows: string[][] = [];

    data.transactionsData.pharmacyInvoices.forEach((invoice: any) => {
      if (invoice.pharmacy_invoice_items?.length > 0) {
        invoice.pharmacy_invoice_items.forEach((item: any) => {
          const medicineName = item.medicines?.name || 'Unknown Medicine';
          itemRows.push([
            medicineName,
            item.quantity.toString(),
            formatPkrAmount(item.unit_price),
            formatPkrAmount(item.total_price)
          ]);
        });
      }
    });

    if (itemRows.length > 0) {
      drawTable(itemHeaders, itemRows, itemColWidths);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No pharmacy transactions recorded for this date.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;
  }

  // ===========================================
  // HOSPITAL SERVICES SECTION
  // ===========================================
  drawSectionHeader('HOSPITAL SERVICES');

  // Lab Reports Table
  if (data.transactionsData?.labReports?.length > 0) {
    drawSubHeader('Laboratory Tests');

    const labHeaders = ['Test Name', 'Patient Name', 'Status', 'Amount'];
    const labColWidths = [60, 50, 30, 30];
    const labRows: string[][] = [];

    data.transactionsData.labReports.forEach((lab: any) => {
      const patientName = lab.patients?.profiles?.first_name && lab.patients?.profiles?.last_name 
        ? `${lab.patients.profiles.first_name} ${lab.patients.profiles.last_name}`
        : 'Unknown Patient';
      
      labRows.push([
        lab.test_name,
        patientName,
        lab.status || 'Completed',
        formatPkrAmount(lab.price || 0)
      ]);
    });

    drawTable(labHeaders, labRows, labColWidths);
  }

  // OT Schedules Table
  if (data.transactionsData?.otSchedules?.length > 0) {
    drawSubHeader('Operation Theater Services');

    const otHeaders = ['Operation', 'Patient', 'Total Cost', 'Doctor Fee', 'Hospital Revenue'];
    const otColWidths = [40, 40, 30, 30, 30];
    const otRows: string[][] = [];

    data.transactionsData.otSchedules.forEach((ot: any) => {
      const patientName = ot.patients?.profiles?.first_name && ot.patients?.profiles?.last_name 
        ? `${ot.patients.profiles.first_name} ${ot.patients.profiles.last_name}`
        : 'Unknown Patient';
      const operationName = ot.ot_operations?.operation_name || 'Operation';
      const hospitalRevenue = (ot.total_cost || 0) - (ot.doctor_expense || 0);
      
      otRows.push([
        operationName,
        patientName,
        formatPkrAmount(ot.total_cost || 0),
        formatPkrAmount(ot.doctor_expense || 0),
        formatPkrAmount(hospitalRevenue)
      ]);
    });

    drawTable(otHeaders, otRows, otColWidths);
  }

  // Emergency Services (if any)
  if (data.transactionsData?.emergencyAppointments?.length > 0) {
    drawSubHeader('Emergency Services');

    const emergencyHeaders = ['Patient Name', 'Service Time', 'Facility Fee'];
    const emergencyColWidths = [60, 50, 40];
    const emergencyRows: string[][] = [];

    data.transactionsData.emergencyAppointments.forEach((emergency: any) => {
      const patientName = emergency.patients?.profiles?.first_name && emergency.patients?.profiles?.last_name 
        ? `${emergency.patients.profiles.first_name} ${emergency.patients.profiles.last_name}`
        : 'Unknown Patient';
      const appointmentTime = new Date(emergency.appointment_date).toLocaleTimeString();
      
      emergencyRows.push([
        patientName,
        appointmentTime,
        formatPkrAmount(emergency.consultation_fee_at_time || 0)
      ]);
    });

    drawTable(emergencyHeaders, emergencyRows, emergencyColWidths);
  }

  // Check if no hospital services
  if ((!data.transactionsData?.labReports?.length) && 
      (!data.transactionsData?.otSchedules?.length) && 
      (!data.transactionsData?.emergencyAppointments?.length)) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No hospital services recorded for this date.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;
  }

  // ===========================================
  // PHARMACY BILLS SECTION
  // ===========================================
  if (data.transactionsData?.pharmacyExpenses?.length > 0) {
    drawSectionHeader('PHARMACY BILLS');

    const pharmacyBillHeaders = ['Type', 'Description', 'Amount', 'Date'];
    const pharmacyBillColWidths = [50, 60, 30, 30];
    const pharmacyBillRows: string[][] = [];

    data.transactionsData.pharmacyExpenses.forEach((expense: any) => {
      const typeDisplay = expense.expense_type === 'hospital_profit_withdrawal' 
        ? 'Profit Withdrawal' 
        : 'Bill Payment';
      
      pharmacyBillRows.push([
        typeDisplay,
        expense.description || '',
        formatPkrAmount(expense.amount),
        new Date(expense.expense_date).toLocaleDateString()
      ]);
    });

    drawTable(pharmacyBillHeaders, pharmacyBillRows, pharmacyBillColWidths);
  }

  // ===========================================
  // EXPENSES SECTION
  // ===========================================
  if (data.transactionsData?.expenses?.length > 0) {
    drawSectionHeader('DAILY EXPENSES');

    const expenseHeaders = ['Category', 'Description', 'Amount', 'Date'];
    const expenseColWidths = [40, 70, 30, 30];
    const expenseRows: string[][] = [];

    data.transactionsData.expenses.forEach((expense: any) => {
      expenseRows.push([
        expense.category,
        expense.description,
        formatPkrAmount(expense.amount),
        new Date(expense.expense_date).toLocaleDateString()
      ]);
    });

    drawTable(expenseHeaders, expenseRows, expenseColWidths);
  }

  // ===========================================
  // REFUNDS SECTION
  // ===========================================
  if (data.transactionsData?.refunds?.length > 0) {
    drawSectionHeader('REFUNDS & RETURNS');

    const refundHeaders = ['Type', 'Description', 'Amount', 'Date'];
    const refundColWidths = [40, 70, 30, 30];
    const refundRows: string[][] = [];

    data.transactionsData.refunds.forEach((refund: any) => {
      refundRows.push([
        refund.refund_type,
        refund.description,
        formatPkrAmount(refund.amount),
        new Date(refund.created_at).toLocaleDateString()
      ]);
    });

    drawTable(refundHeaders, refundRows, refundColWidths);
  }

  // ===========================================
  // FINANCIAL SUMMARY SECTION
  // ===========================================
  checkNewPage(100);
  
  drawSectionHeader('FINANCIAL SUMMARY');

  // Pharmacy Account Summary with full details
  drawSubHeader('Pharmacy Account Summary');
  
  // Get pharmacy account data from transactions
  const pharmacyStartingBalance = data.transactionsData?.pharmacyAccount?.starting_balance || 0;
  const pharmacyExpenses = data.transactionsData?.pharmacyExpenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
  const netPharmacyBalance = pharmacyStartingBalance + data.pharmacyProfit - pharmacyExpenses;
  
  const pharmacySummaryHeaders = ['Description', 'Amount'];
  const pharmacySummaryColWidths = [120, 50];
  const pharmacySummaryRows = [
    ['Opening Balance', formatPkrAmount(pharmacyStartingBalance)],
    ['Today\'s Sales Revenue', formatPkrAmount(data.pharmacyRevenue)],
    ['Today\'s Gross Profit', formatPkrAmount(data.pharmacyProfit)],
    ['Bills Paid Today', `(${formatPkrAmount(pharmacyExpenses)})`],
    ['Current Account Balance', formatPkrAmount(netPharmacyBalance)],
    ['Total Medicines Stock Value', formatPkrAmount(data.transactionsData?.totalStockValue || 0)]
  ];

  drawTable(pharmacySummaryHeaders, pharmacySummaryRows, pharmacySummaryColWidths);
  
  yPosition += 15;
  
  // Overall Summary table with better formatting
  drawSubHeader('Overall Daily Summary');
  
  const summaryHeaders = ['Description', 'Amount'];
  const summaryColWidths = [120, 50];
  const summaryRows = [
    ['Hospital Services Revenue', formatPkrAmount(data.hospitalRevenue)],
    ['Pharmacy Revenue', formatPkrAmount(data.pharmacyRevenue)],
    ['Pharmacy Profit', formatPkrAmount(data.pharmacyProfit)],
    ['Total Daily Expenses', `(${formatPkrAmount(data.totalExpenses)})`],
    ['Total Refunds & Returns', `(${formatPkrAmount(data.totalRefunds)})`]
  ];

  drawTable(summaryHeaders, summaryRows, summaryColWidths);

  // ===========================================
  // HOSPITAL CLOSING BALANCE CALCULATION
  // ===========================================
  checkNewPage(120);
  
  drawSectionHeader('HOSPITAL CLOSING BALANCE CALCULATION');

  // Calculate hospital net profit (excluding pharmacy)
  const hospitalNetProfit = data.hospitalRevenue - data.totalExpenses - data.totalRefunds;
  const newClosingBalance = previousClosingBalance + hospitalNetProfit;

  // Hospital Balance Summary
  const balanceHeaders = ['Description', 'Amount'];
  const balanceColWidths = [120, 50];
  const balanceRows = [
    ['Opening Balance (Previous Day)', formatPkrAmount(previousClosingBalance)],
    ['Today\'s Hospital Revenue', formatPkrAmount(data.hospitalRevenue)],
    ['Today\'s Hospital Expenses', `(${formatPkrAmount(data.totalExpenses)})`],
    ['Today\'s Refunds', `(${formatPkrAmount(data.totalRefunds)})`],
    ['Today\'s Hospital Net Profit/Loss', formatPkrAmount(hospitalNetProfit)]
  ];

  drawTable(balanceHeaders, balanceRows, balanceColWidths);

  // New Closing Balance - Special formatting
  yPosition += 15;
  const newClosingBalanceY = yPosition;
  
  // Draw highlighted box for new closing balance
  doc.setFillColor(240, 255, 240);
  doc.setDrawColor(100, 200, 100);
  doc.setLineWidth(2);
  doc.rect(20, newClosingBalanceY - 5, pageWidth - 40, 20, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 0);
  doc.text('NEW CLOSING BALANCE:', 30, newClosingBalanceY + 8);
  doc.text(formatPkrAmount(newClosingBalance), pageWidth - 30, newClosingBalanceY + 8, { align: 'right' });

  yPosition += 35;

  // Save the new closing balance to database (single updatable value)
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get the latest record to update
    const { data: latestRecord } = await supabase
      .from('hospital_closing_balance')
      .select('id')
      .order('closing_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRecord) {
      // Update the existing record with new balance
      await supabase
        .from('hospital_closing_balance')
        .update({ 
          closing_date: data.closingDate,
          closing_balance: newClosingBalance,
          notes: `Updated from daily closing on ${data.closingDate}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', latestRecord.id);
    } else {
      // Create the first record
      await supabase
        .from('hospital_closing_balance')
        .insert({ 
          closing_date: data.closingDate,
          closing_balance: newClosingBalance,
          notes: `First closing balance created on ${data.closingDate}`
        });
    }
  } catch (error) {
    console.error('Error updating closing balance:', error);
  }

  // ===========================================
  // FOOTER
  // ===========================================
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Doctor consultation fees are excluded as they belong to individual doctor finances.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text('Hospital closing balance includes only hospital revenue, expenses, and refunds.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('This report was generated automatically by the hospital management system.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
