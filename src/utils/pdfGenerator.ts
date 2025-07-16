
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

  // Invoice details in a comprehensive box
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition - 5, pageWidth - 30, 50); // Taller box for more info
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice Number:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.issueDate, 135, yPosition + 5);
  
  // Second row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Name:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientId || 'N/A', 160, yPosition + 5);
  
  // Third row - Use utility function for better contact extraction
  yPosition += 10;
  const phoneNumber = data.patientEmail ? getPatientContactNumber(null, { email: data.patientEmail, phone: data.patientPhone }) : (data.patientPhone || 'N/A');
  doc.setFont('helvetica', 'bold');
  doc.text('Contact:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(phoneNumber, 60, yPosition + 5);

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
  
  // Test items
  doc.setFont('helvetica', 'normal');
  data.tests.forEach((test) => {
    xPosition = 20;
    
    // Test name
    doc.text(test.name, xPosition, yPosition);
    xPosition += colWidths[0];
    
    // Description
    const description = test.description || '-';
    doc.text(description.length > 20 ? description.substring(0, 17) + '...' : description, xPosition, yPosition);
    xPosition += colWidths[1];
    
    // Price
    doc.text(formatPkrAmount(test.price), xPosition, yPosition);
    
    yPosition += 8;
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

  return doc.output('blob');
};

export const generateInvoicePDF = async (invoice: any) => {
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
  const invoicePatientName = `${invoice.patient?.users?.first_name || ''} ${invoice.patient?.users?.last_name || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Name:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoicePatientName || 'Patient', 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.patient?.patient_number || 'N/A', 160, yPosition + 5);
  
  // Third row - Use utility function to get best contact number
  yPosition += 10;
  const phoneNumber = getPatientContactNumber(invoice.patient, invoice.patient?.users);
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
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add hospital header
  let yPosition = await addHospitalHeader(doc, 'OT OPERATION INVOICE');
  yPosition += 10;

  // Invoice details in a comprehensive box
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition - 5, pageWidth - 30, 65); // Even taller for OT details
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  
  // First row
  doc.text('Invoice Number:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 135, yPosition + 5);
  
  // Second row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Name:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName, 70, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientId || 'N/A', 160, yPosition + 5);
  
  // Third row
  yPosition += 10;
  const otPhoneNumber = data.patientPhone || 'N/A';
  doc.setFont('helvetica', 'bold');
  doc.text('Contact:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(otPhoneNumber, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Doctor:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.doctorName, 155, yPosition + 5);
  
  // Fourth row
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Procedure:', 20, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.procedure, 60, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('OT Room:', 120, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.room, 155, yPosition + 5);

  yPosition += 65;

  // Items table with detailed breakdown for OT
  const tableStartY = yPosition;
  const colWidths = [60, 25, 40, 40];
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  
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
  
  // Items
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  data.items.forEach((item) => {
    xPosition = 20;
    
    // Description
    const description = item.description.length > 35 ? item.description.substring(0, 32) + '...' : item.description;
    doc.text(description, xPosition, yPosition);
    xPosition += colWidths[0];
    
    // Quantity
    doc.text(item.quantity.toString(), xPosition, yPosition);
    xPosition += colWidths[1];
    
    // Unit Price
    doc.text(formatPkrAmount(item.unitPrice), xPosition, yPosition);
    xPosition += colWidths[2];
    
    // Total Price
    doc.text(formatPkrAmount(item.totalPrice), xPosition, yPosition);
    
    yPosition += 8;
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
  doc.text('Thank you for choosing our medical services!', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('This invoice serves as proof of completed operation.', pageWidth / 2, yPosition + 8, { align: 'center' });

  // Open PDF in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
