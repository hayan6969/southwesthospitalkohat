
import jsPDF from 'jspdf';
import { formatPkrAmount } from './currency';
import { supabase } from '@/integrations/supabase/client';
import { getPatientContactNumber } from './patientUtils';
import { formatInPakistanTime } from './timezone';

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

// Helper to fetch creator name from profile
const fetchCreatorName = async (createdBy?: string): Promise<string> => {
  if (!createdBy) return '';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', createdBy)
      .single();
    if (profile) return `${profile.first_name} ${profile.last_name}`.trim();
  } catch (e) {
    console.error('Error fetching creator name:', e);
  }
  return '';
};

// Helper to add "Created By" line to any PDF
const addCreatedByLine = (doc: jsPDF, yPosition: number, createdByName: string): number => {
  if (createdByName) {
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Created By:', 15, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(createdByName, 55, yPosition);
  }
  return yPosition;
};

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
  discount?: {
    originalAmount: number;
    discountedAmount: number;
    discountApplied: number;
    discountLabel: string | null;
  };
  createdBy?: string;
}) => {
  const createdByName = await fetchCreatorName(data.createdBy);
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
  const totalsX = pageWidth - 85;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);

  if (data.discount && data.discount.discountApplied > 0) {
    // Show subtotal, discount, and final total
    const boxHeight = 38;
    doc.rect(totalsX, yPosition - 5, 80, boxHeight);
    
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX + 5, yPosition + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(formatPkrAmount(data.discount.originalAmount), totalsX + 45, yPosition + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 128, 0);
    doc.text(`Discount (${data.discount.discountLabel}):`, totalsX + 5, yPosition + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(`-${formatPkrAmount(data.discount.discountApplied)}`, totalsX + 45, yPosition + 14);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.line(totalsX + 5, yPosition + 19, totalsX + 75, yPosition + 19);
    doc.text('Total Amount:', totalsX + 5, yPosition + 26);
    doc.text(formatPkrAmount(data.discount.discountedAmount), totalsX + 5, yPosition + 33);
  } else {
    doc.rect(totalsX, yPosition - 5, 80, 18);
    doc.text('Total Amount:', totalsX + 5, yPosition + 4);
    doc.text(formatPkrAmount(data.totalAmount), totalsX + 5, yPosition + 12);
  }

  // Created By attribution
  yPosition = addCreatedByLine(doc, yPosition, createdByName);

  // Footer
  yPosition += 15;
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
  
  // Fetch creator name if created_by exists
  const createdByName = invoice.created_by_name || await fetchCreatorName(invoice.created_by);
  
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

  // Consistent column positions
  const leftLabel = 20;
  const leftValue = 75;
  const rightLabel = 120;
  const rightValue = 155;
  
  // First row
  doc.text('Invoice Number:', leftLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, leftValue, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', rightLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.created_at).toLocaleDateString(), rightValue, yPosition + 5);
  
  yPosition += 10;
  
  // Check if this is an emergency consultation by looking for emergency patient data
  const isEmergencyConsultation = invoice.patient_id === '00000000-0000-0000-0000-000000000001' || 
                                   invoice.emergency_patient_data ||
                                   (invoice.description && invoice.description.includes('Emergency Consultation'));

  let invoicePatientName, patientPhone, patientCnic;
  
  if (isEmergencyConsultation && invoice.emergency_patient_data) {
    // Use the actual emergency patient data stored in the invoice
    invoicePatientName = invoice.emergency_patient_data.name;
    patientPhone = invoice.emergency_patient_data.phone;
    patientCnic = invoice.emergency_patient_data.cnic;
  } else if (isEmergencyConsultation && invoice.patient?.profiles) {
    // Fallback to patient profiles data (for older emergency invoices)
    const patientProfile = invoice.patient.profiles;
    invoicePatientName = `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim();
    patientPhone = patientProfile.phone;
    patientCnic = invoice.patient.cnic;
  } else {
    // Handle both old structure (patient.users) and new structure (patient.profiles)
    const patientProfile = invoice.patient?.profiles || invoice.patient?.users;
    invoicePatientName = patientProfile ? 
      `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 
      (invoice.patient_name || 'Patient');
    const patientProfileForContact = invoice.patient?.profiles || invoice.patient?.users;
    patientPhone = getPatientContactNumber(invoice.patient, patientProfileForContact);
    patientCnic = invoice.patient?.cnic;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Name:', leftLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoicePatientName, leftValue, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID:', rightLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.patient?.patient_number || 'N/A', rightValue, yPosition + 5);
  
  // Third row - Get contact information
  yPosition += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Contact:', leftLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(patientPhone || 'N/A', leftValue, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', rightLabel, yPosition + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.status, rightValue, yPosition + 5);
  
  // Fourth row - Add CNIC if available (for emergency consultations)
  if (patientCnic) {
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('CNIC:', leftLabel, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(patientCnic, leftValue, yPosition + 5);
  }
  
  // Fifth row (if due date exists) - adjusted for CNIC addition
  if (invoice.due_date) {
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', leftLabel, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoice.due_date).toLocaleDateString(), leftValue, yPosition + 5);
  }

  // Move to just below the info box
  // Info box starts at (initial yPosition - 5) and has height 60, so bottom is at (initial + 55)
  // But yPosition has been incremented inside the box, so just add a small gap
  yPosition += 20;

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
  
  // Wrap text to fit within the description column (120 width)
  const maxLineWidth = colWidths[0] - 10; // Leave some padding
  const wrappedLines = doc.splitTextToSize(description, maxLineWidth);
  
  // Calculate the height needed for all lines
  const lineHeight = 5;
  const textHeight = wrappedLines.length * lineHeight;
  
  // Draw the wrapped description text
  doc.text(wrappedLines, xPosition, yPosition);
  
  // Draw the amount aligned to the top of the description
  xPosition += colWidths[0];
  doc.text(formatPkrAmount(invoice.amount), xPosition, yPosition);
  
  // Update yPosition based on the text height with padding for taller row
  yPosition += Math.max(textHeight, 8) + 8;
  
  // Draw table border
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, tableStartY, pageWidth - 30, yPosition - tableStartY);
  
  // Vertical line for table — separating Description and Amount columns
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

  // Created By attribution
  yPosition = addCreatedByLine(doc, yPosition, createdByName);

  // Footer
  yPosition += 15;
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
  createdBy?: string;
}) => {
  const createdByName = await fetchCreatorName(data.createdBy);
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

  // Created By attribution
  yPosition = addCreatedByLine(doc, yPosition, createdByName);

  // Footer
  yPosition += 15;
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
  createdBy?: string;
}) => {
  const createdByName = await fetchCreatorName(data.createdBy);
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

  // Created By attribution
  yPosition = addCreatedByLine(doc, yPosition, createdByName);

  // Footer - compact
  yPosition += 15;
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

// Helper function to query transaction data for a specific date
const queryTransactionDataForDate = async (closingDate: string, closingTime: string) => {
  // Get the previous closing to determine cutoff time (use exact previous closing before this closingTime)
  const { data: previous } = await supabase
    .from('daily_closings')
    .select('closing_time')
    .lt('closing_time', closingTime)
    .order('closing_time', { ascending: false })
    .limit(1);
  
  const previousClosing = previous?.[0];
  const cutoffTime = previousClosing?.closing_time || `${closingDate}T00:00:00Z`;
  const upperBound = closingTime;
  
  console.log(`Querying transaction data from ${cutoffTime} to ${upperBound}`);
  console.log(`PDF Query - Closing Date: ${closingDate}, Closing Time: ${closingTime}`);
  
  // Query all transaction types with the same logic as FinanceDaily
  const [
    hospitalInvoicesRes,
    pharmacyInvoicesRes,
    labReportsRes,
    xrayReportsRes,
    otSchedulesRes,
    emergencyAppointmentsRes,
    expensesRes,
    refundsRes,
    miscellaneousIncomeRes
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, patients(id, profiles(first_name, last_name)), emergency_patient_data')
      .eq('status', 'paid')
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('pharmacy_invoices')
      .select(`
        *,
        pharmacy_invoice_items(
          quantity,
          unit_price,
          total_price,
          medicine_id,
          medicines(name, purchase_price, selling_price)
        )
      `)
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('lab_reports')
      .select('*, patients(id, profiles(first_name, last_name))')
      .not('price', 'is', null)
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('xray_reports')
      .select('*, patients(id, profiles(first_name, last_name))')
      .not('price', 'is', null)
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('ot_schedules')
      .select('*')
      .in('status', ['completed', 'pending'])
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('appointments')
      .select('*')
      .ilike('type', 'emergency')
      .eq('status', 'completed')
      .gte('appointment_date', cutoffTime)
      .lte('appointment_date', upperBound),
    
    supabase
      .from('expenses')
      .select('*')
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('refunds')
      .select('*')
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound),
    
    supabase
      .from('miscellaneous_income')
      .select('*')
      .gte('created_at', cutoffTime)
      .lte('created_at', upperBound)
  ]);
  
  // Enrich lab reports with invoice amounts (for discount visibility)
  const labReports = labReportsRes.data || [];
  const labInvoiceIds = labReports.map((lr: any) => lr.invoice_id).filter(Boolean);
  let labInvoiceMap = new Map<string, number>();
  if (labInvoiceIds.length > 0) {
    const { data: labInvoices } = await supabase
      .from('invoices')
      .select('id, amount')
      .in('id', labInvoiceIds);
    (labInvoices || []).forEach((inv: any) => {
      labInvoiceMap.set(inv.id, Number(inv.amount) || 0);
    });
  }
  const enrichedLabReports = labReports.map((lr: any) => ({
    ...lr,
    invoice_amount: lr.invoice_id ? labInvoiceMap.get(lr.invoice_id) ?? null : null,
  }));

  return {
    hospitalInvoices: hospitalInvoicesRes.data || [],
    pharmacyInvoices: pharmacyInvoicesRes.data || [],
    labReports: enrichedLabReports,
    xrayReports: xrayReportsRes.data || [],
    otSchedules: otSchedulesRes.data || [],
    emergencyAppointments: emergencyAppointmentsRes.data || [],
    expenses: expensesRes.data || [],
    refunds: refundsRes.data || [],
    miscellaneousIncome: miscellaneousIncomeRes.data || []
  };
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
  transactionsData?: any;
  categoryFilter?: string; // 'all' or specific category like 'Lab', 'OPD', etc.
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Check if we have stored transaction data (for historical closings) or need to query fresh data
  let transactionsData = data.transactionsData;
  
  if (!transactionsData) {
    console.log('No stored transaction data provided, querying fresh data for:', data.closingDate);
    // Query fresh data for the specific closing date
    transactionsData = await queryTransactionDataForDate(data.closingDate, data.closingTime);
  } else {
    console.log('Using stored transaction data for historical closing:', data.closingDate);
    console.log('Stored xray reports count:', transactionsData.xrayReports?.length || 0);
    console.log('Stored xray reports:', transactionsData.xrayReports);
    
    // Check if stored data is missing xray reports and supplement if needed
    if (!transactionsData.xrayReports || transactionsData.xrayReports.length === 0) {
      console.log('⚠️ Stored data missing xray reports, querying xrays for date:', data.closingDate);
      const supplementalData = await queryTransactionDataForDate(data.closingDate, data.closingTime);
      console.log('✅ Supplemental xray data found:', supplementalData.xrayReports?.length || 0, supplementalData.xrayReports);
      transactionsData.xrayReports = supplementalData.xrayReports || [];
      console.log('🎯 Final xray reports in transactions data:', transactionsData.xrayReports?.length || 0);
    } else {
      console.log('✅ Stored data has xray reports:', transactionsData.xrayReports?.length || 0);
    }

    // Ensure lab reports have price values; supplement if missing or zeroed
    const needsLabSupplement = !transactionsData.labReports || transactionsData.labReports.length === 0 || transactionsData.labReports.every((lr: any) => !lr?.price || Number(lr.price) <= 0);
    if (needsLabSupplement) {
      console.log('⚠️ Stored data missing lab report prices, supplementing with lab_reports for date:', data.closingDate);
      const supplementalData = await queryTransactionDataForDate(data.closingDate, data.closingTime);
      console.log('✅ Supplemental lab data found:', supplementalData.labReports?.length || 0);
      transactionsData.labReports = supplementalData.labReports || [];
      console.log('🎯 Final lab reports in transactions data:', transactionsData.labReports?.length || 0);
    }
  }

  // ===========================================
  // CLOSING BALANCE SECTION (AT TOP)
  // ===========================================
  
  // Get the correct opening balance from hospital_closing_balance table
  let previousClosingBalance = 0;
  
  const { data: prevBalanceRecord } = await supabase
    .from('hospital_closing_balance')
    .select('closing_balance')
    .lt('closing_date', data.closingDate)
    .order('closing_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevBalanceRecord) {
    previousClosingBalance = Number(prevBalanceRecord.closing_balance || 0);
  }

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
  doc.text(`Closing Time: ${formatInPakistanTime(data.closingTime, 'PPP p')}`, pageWidth / 2, yPosition, { align: 'center' });
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
          // Adjust text truncation based on column width and content
          let displayText = cell;
          let maxLength = Math.floor(colWidths[colIndex] * 0.8); // Adjust based on column width
          
          // Don't truncate amounts or short text
          if (typeof cell === 'string' && cell.length > maxLength && !cell.includes('Rs.') && !cell.includes('(') && maxLength > 10) {
            displayText = cell.substring(0, maxLength - 3) + '...';
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
  // DETAILED OPD-STYLE TRANSACTION REPORT
  // ===========================================
  const filterLabel = data.categoryFilter && data.categoryFilter !== 'all' ? data.categoryFilter : null;
  drawSectionHeader(filterLabel ? `DETAILED REPORT — ${filterLabel.toUpperCase()}` : 'DETAILED TRANSACTION REPORT');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    filterLabel 
      ? `Showing ${filterLabel} transactions only`
      : 'Grouped by service category and shift (Night: 12am–8am, Morning: 8am–2pm, Evening: 2pm–12am)',
    pageWidth / 2, yPosition, { align: 'center' }
  );
  yPosition += 10;

  // Helper: determine shift from timestamp in Pakistan time
  const getShiftFromTime = (dateStr: string): string => {
    const pkHour = Number.parseInt(formatInPakistanTime(dateStr, 'H'), 10);
    if (Number.isNaN(pkHour)) return 'Morning';
    if (pkHour >= 0 && pkHour < 8) return 'Night';
    if (pkHour >= 8 && pkHour < 14) return 'Morning';
    return 'Evening';
  };

  const formatTime = (dateStr: string): string => {
    try {
      return formatInPakistanTime(dateStr, 'h:mm a');
    } catch {
      return '—';
    }
  };

  interface TxnItem {
    patientName: string;
    time: string;
    procedure: string;
    consultant: string;
    amount: number;
    docShare: number;
    hosShare: string | number;
    operator: string;
    category: string;
    shift: string;
  }

  const allTxns: TxnItem[] = [];
  const hospitalInvoicesAll = transactionsData?.hospitalInvoices || [];

  // Resolve operator names from profile IDs so PDF matches on-screen report
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const operatorIdSet = new Set<string>();
  const collectOperatorId = (value?: string | null) => {
    if (value && uuidRegex.test(value)) operatorIdSet.add(value);
  };

  hospitalInvoicesAll.forEach((inv: any) => collectOperatorId(inv.created_by));
  (transactionsData?.miscellaneousIncome || []).forEach((misc: any) => collectOperatorId(misc.created_by));

  const operatorNamesById = new Map<string, string>();
  if (operatorIdSet.size > 0) {
    const { data: operatorProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', Array.from(operatorIdSet));

    (operatorProfiles || []).forEach((profile: any) => {
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      operatorNamesById.set(profile.id, fullName || '—');
    });
  }

  const resolveOperatorName = (value?: string | null) => {
    if (!value) return '—';
    if (operatorNamesById.has(value)) return operatorNamesById.get(value) || '—';
    return uuidRegex.test(value) ? '—' : value;
  };

  let grandTotal = 0;
  let grandDocShare = 0;
  let grandHosShare = 0;

  const isEmergencyInv = (inv: any) =>
    inv.description?.toLowerCase().includes('emergency') ||
    inv.emergency_patient_data ||
    inv.invoice_number?.startsWith('EMG-') ||
    inv.invoice_number?.startsWith('EMERGENCY-');

  // OPD Consultations
  hospitalInvoicesAll.filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv)).forEach((inv: any) => {
    const p = inv.patients?.profiles;
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
      time: inv.created_at,
      procedure: inv.description || 'OPD Consultancy',
      consultant: '—',
      amount: Number(inv.amount) || 0,
      docShare: Number(inv.amount) || 0,
      hosShare: 0,
      operator: resolveOperatorName(inv.created_by),
      category: 'OPD',
      shift: getShiftFromTime(inv.created_at),
    });
  });

  // Emergency invoices
  hospitalInvoicesAll.filter(isEmergencyInv).forEach((inv: any) => {
    const p = inv.patients?.profiles;
    const epd = inv.emergency_patient_data as any;
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (epd?.name || 'Unknown'),
      time: inv.created_at,
      procedure: inv.description || 'Emergency',
      consultant: '—',
      amount: Number(inv.amount) || 0,
      docShare: 0,
      hosShare: Number(inv.amount) || 0,
      operator: resolveOperatorName(inv.created_by),
      category: 'Emergency',
      shift: getShiftFromTime(inv.created_at),
    });
  });

  // Emergency appointments
  (transactionsData?.emergencyAppointments || []).forEach((apt: any) => {
    const p = apt.patients?.profiles;
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
      time: apt.appointment_date,
      procedure: 'Emergency Consultation',
      consultant: apt.doctors?.profiles ? `Dr. ${apt.doctors.profiles.first_name} ${apt.doctors.profiles.last_name}` : '—',
      amount: Number(apt.consultation_fee_at_time) || 0,
      docShare: 0,
      hosShare: Number(apt.consultation_fee_at_time) || 0,
      operator: '—',
      category: 'Emergency',
      shift: getShiftFromTime(apt.appointment_date),
    });
  });

  // Build operator lookup from hospital invoices for lab/xray/OT attribution
  const invoiceOperatorLookup = new Map<string, string>();
  hospitalInvoicesAll.forEach((inv: any) => {
    if (inv.created_by && inv.invoice_number) {
      // Map by invoice_number prefix + patient_id for matching
      invoiceOperatorLookup.set(inv.invoice_number, inv.created_by);
      // Also map by patient_id + type for fuzzy matching
      const key = `${inv.patient_id}_${inv.invoice_number?.split('-')[0]}`;
      if (!invoiceOperatorLookup.has(key)) {
        invoiceOperatorLookup.set(key, inv.created_by);
      }
    }
  });

  const resolveLabOperator = (lab: any): string => {
    // Direct created_by
    if (lab.created_by) return resolveOperatorName(lab.created_by);
    // Try to find matching LAB- invoice by patient_id
    const key = `${lab.patient_id}_LAB`;
    const opId = invoiceOperatorLookup.get(key);
    if (opId) return resolveOperatorName(opId);
    // Try matching by invoice_id
    if (lab.invoice_id) {
      const matchingInv = hospitalInvoicesAll.find((inv: any) => inv.id === lab.invoice_id);
      if (matchingInv?.created_by) return resolveOperatorName(matchingInv.created_by);
    }
    return '—';
  };

  const resolveXrayOperator = (xray: any): string => {
    if (xray.created_by) return resolveOperatorName(xray.created_by);
    // Find matching XRAY- invoice
    const key = `${xray.patient_id}_XRAY`;
    const opId = invoiceOperatorLookup.get(key) || invoiceOperatorLookup.get(`${xray.patient_id}_XR`);
    if (opId) return resolveOperatorName(opId);
    return '—';
  };

  const resolveOtOperator = (ot: any): string => {
    if (ot.created_by) return resolveOperatorName(ot.created_by);
    // Find matching OT- invoice
    const key = `${ot.patient_id}_OT`;
    const opId = invoiceOperatorLookup.get(key);
    if (opId) return resolveOperatorName(opId);
    return '—';
  };

  // Lab reports - use invoice amount (includes discount) if available, fallback to price
  (transactionsData?.labReports || []).forEach((lab: any) => {
    const p = lab.patients?.profiles;
    const originalPrice = Number(lab.price) || 0;
    // Use enriched invoice_amount (from separate invoice lookup) for discount visibility
    const invoiceAmount = lab.invoice_amount != null ? Number(lab.invoice_amount) : null;
    const finalAmount = invoiceAmount != null ? invoiceAmount : originalPrice;
    const discountApplied = originalPrice > 0 && finalAmount < originalPrice ? originalPrice - finalAmount : 0;
    let procedure = lab.test_name || lab.description || 'Lab Test';
    if (discountApplied > 0) {
      procedure = `${procedure} (Disc: Rs. ${discountApplied.toFixed(2)})`;
    }
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
      time: lab.created_at || lab.test_date,
      procedure,
      consultant: '—',
      amount: finalAmount,
      docShare: 0,
      hosShare: finalAmount,
      operator: resolveLabOperator(lab),
      category: 'Lab',
      shift: getShiftFromTime(lab.created_at || lab.test_date),
    });
  });

  // X-ray reports
  (transactionsData?.xrayReports || []).forEach((xray: any) => {
    const p = (xray as any).patients?.profiles;
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
      time: xray.created_at,
      procedure: xray.test_name || 'X-Ray',
      consultant: '—',
      amount: Number(xray.price) || 0,
      docShare: 0,
      hosShare: Number(xray.price) || 0,
      operator: resolveXrayOperator(xray),
      category: 'X-Ray',
      shift: getShiftFromTime(xray.created_at),
    });
  });

  // OT schedules
  (transactionsData?.otSchedules || []).forEach((ot: any) => {
    const p = ot.patients?.profiles;
    allTxns.push({
      patientName: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
      time: ot.created_at,
      procedure: ot.ot_operations?.operation_name || ot.notes || 'Surgery',
      consultant: ot.doctor_name || '—',
      amount: Number(ot.total_cost) || 0,
      docShare: Number(ot.doctor_expense) || 0,
      hosShare: (Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0),
      operator: resolveOtOperator(ot),
      category: 'OT',
      shift: getShiftFromTime(ot.created_at),
    });
  });

  // Miscellaneous income
  (transactionsData?.miscellaneousIncome || []).forEach((misc: any) => {
    allTxns.push({
      patientName: '—',
      time: misc.created_at,
      procedure: misc.description || 'Miscellaneous',
      consultant: '—',
      amount: Number(misc.amount) || 0,
      docShare: 0,
      hosShare: Number(misc.amount) || 0,
      operator: resolveOperatorName(misc.created_by),
      category: 'Miscellaneous',
      shift: getShiftFromTime(misc.created_at),
    });
  });

  // Apply category filter if specified
  const activeCategoryFilter = data.categoryFilter && data.categoryFilter !== 'all' ? data.categoryFilter : null;
  const filteredTxns = activeCategoryFilter ? allTxns.filter(t => t.category === activeCategoryFilter) : allTxns;

  // Group by category then shift
  const categoryOrder = activeCategoryFilter ? [activeCategoryFilter] : ['OPD', 'Emergency', 'Lab', 'X-Ray', 'OT', 'Miscellaneous'];
  const shiftOrder = ['Night', 'Morning', 'Evening'];

  // Table column widths for detailed report
  const detailColWidths = [8, 30, 14, 35, 25, 18, 18, 18, 18];
  const detailHeaders = ['Sr#', 'Patient', 'Time', 'Procedure', 'Consultant', 'Amount', 'Doc.Share', 'Hos.Share', 'Operator'];
  const totalTableWidth = detailColWidths.reduce((a, b) => a + b, 0);
  const detailStartX = (pageWidth - totalTableWidth) / 2;

  if (filteredTxns.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No transactions recorded for this period.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  } else {
    let srNo = 0;

    // Draw table header
    const drawDetailHeader = () => {
      checkNewPage(20);
      doc.setFillColor(50, 50, 50);
      doc.rect(detailStartX, yPosition, totalTableWidth, 8, 'F');
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      // Draw vertical lines for header
      let lx = detailStartX;
      detailColWidths.forEach(w => {
        doc.line(lx, yPosition, lx, yPosition + 8);
        lx += w;
      });
      doc.line(lx, yPosition, lx, yPosition + 8); // right border
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      let xPos = detailStartX + 1;
      detailHeaders.forEach((h, i) => {
        doc.text(h, xPos, yPosition + 5.5);
        xPos += detailColWidths[i];
      });
      yPosition += 8;
    };

    // Helper to draw cell borders for a row
    const drawRowBorders = (rowY: number, rowH: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.15);
      // Horizontal bottom line
      doc.line(detailStartX, rowY + rowH, detailStartX + totalTableWidth, rowY + rowH);
      // Vertical cell lines
      let lx = detailStartX;
      detailColWidths.forEach(w => {
        doc.line(lx, rowY, lx, rowY + rowH);
        lx += w;
      });
      doc.line(lx, rowY, lx, rowY + rowH); // right border
    };

    drawDetailHeader();

    categoryOrder.forEach(cat => {
      const catItems = filteredTxns.filter(t => t.category === cat);
      if (catItems.length === 0) return;

      // Category header row
      checkNewPage(15);
      doc.setFillColor(230, 240, 250);
      doc.rect(detailStartX, yPosition, totalTableWidth, 7, 'F');
      drawRowBorders(yPosition, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(40, 60, 120);
      doc.text(cat.toUpperCase() + ' SERVICES', detailStartX + 3, yPosition + 5);
      yPosition += 7;

      let catTotal = 0, catDoc = 0, catHos = 0;

      shiftOrder.forEach(shift => {
        const shiftItems = catItems.filter(t => t.shift === shift).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        if (shiftItems.length === 0) return;

        // Shift sub-header
        if (yPosition + 15 > pageHeight - 20) { doc.addPage(); yPosition = 15; drawDetailHeader(); }
        doc.setFillColor(245, 245, 245);
        doc.rect(detailStartX, yPosition, totalTableWidth, 6, 'F');
        drawRowBorders(yPosition, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(`  ${shift}`, detailStartX + 2, yPosition + 4.5);
        yPosition += 6;

        let shiftTotal = 0, shiftDoc = 0, shiftHos = 0;

        shiftItems.forEach(item => {
          srNo++;
          if (yPosition + 8 > pageHeight - 20) { doc.addPage(); yPosition = 15; drawDetailHeader(); }

          // Alternate row bg
          if (srNo % 2 === 0) {
            doc.setFillColor(252, 252, 252);
            doc.rect(detailStartX, yPosition, totalTableWidth, 7, 'F');
          }
          drawRowBorders(yPosition, 7);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(40, 40, 40);

          let xPos = detailStartX + 1;
          const rowData = [
            String(srNo),
            (item.patientName || '').substring(0, 18),
            formatTime(item.time),
            (item.procedure || '').substring(0, 22),
            (item.consultant || '').substring(0, 16),
            formatPkrAmount(item.amount),
            item.docShare > 0 ? formatPkrAmount(item.docShare) : '—',
            Number(item.hosShare) > 0 ? formatPkrAmount(Number(item.hosShare)) : '—',
            (item.operator || '—').substring(0, 12),
          ];

          rowData.forEach((cell, i) => {
            if (i >= 5 && i <= 7) {
              doc.text(cell, xPos + detailColWidths[i] - 2, yPosition + 5, { align: 'right' });
            } else {
              doc.text(cell, xPos, yPosition + 5);
            }
            xPos += detailColWidths[i];
          });

          shiftTotal += item.amount;
          shiftDoc += item.docShare;
          shiftHos += Number(item.hosShare);
          yPosition += 7;
        });

        // Shift sub-total
        if (yPosition + 8 > pageHeight - 20) { doc.addPage(); yPosition = 15; drawDetailHeader(); }
        doc.setFillColor(240, 240, 240);
        doc.rect(detailStartX, yPosition, totalTableWidth, 6, 'F');
        drawRowBorders(yPosition, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        doc.text(`${shift} / Sub Total:`, detailStartX + 3, yPosition + 4.5);
        const stX = detailStartX + detailColWidths[0] + detailColWidths[1] + detailColWidths[2] + detailColWidths[3] + detailColWidths[4];
        doc.text(formatPkrAmount(shiftTotal), stX + detailColWidths[5] - 2, yPosition + 4.5, { align: 'right' });
        doc.text(formatPkrAmount(shiftDoc), stX + detailColWidths[5] + detailColWidths[6] - 2, yPosition + 4.5, { align: 'right' });
        doc.text(formatPkrAmount(shiftHos), stX + detailColWidths[5] + detailColWidths[6] + detailColWidths[7] - 2, yPosition + 4.5, { align: 'right' });
        yPosition += 6;

        catTotal += shiftTotal;
        catDoc += shiftDoc;
        catHos += shiftHos;
      });

      // Category sub-total
      if (yPosition + 8 > pageHeight - 20) { doc.addPage(); yPosition = 15; drawDetailHeader(); }
      doc.setFillColor(220, 230, 245);
      doc.rect(detailStartX, yPosition, totalTableWidth, 7, 'F');
      drawRowBorders(yPosition, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(40, 60, 120);
      doc.text(`${cat} / Sub Total:`, detailStartX + 3, yPosition + 5);
      const ctX = detailStartX + detailColWidths[0] + detailColWidths[1] + detailColWidths[2] + detailColWidths[3] + detailColWidths[4];
      doc.text(formatPkrAmount(catTotal), ctX + detailColWidths[5] - 2, yPosition + 5, { align: 'right' });
      doc.text(formatPkrAmount(catDoc), ctX + detailColWidths[5] + detailColWidths[6] - 2, yPosition + 5, { align: 'right' });
      doc.text(formatPkrAmount(catHos), ctX + detailColWidths[5] + detailColWidths[6] + detailColWidths[7] - 2, yPosition + 5, { align: 'right' });
      yPosition += 8;

      grandTotal += catTotal;
      grandDocShare += catDoc;
      grandHosShare += catHos;
    });

    // Grand total
    checkNewPage(12);
    doc.setFillColor(40, 40, 40);
    doc.rect(detailStartX, yPosition, totalTableWidth, 8, 'F');
    drawRowBorders(yPosition, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL:', detailStartX + 3, yPosition + 5.5);
    const gtX = detailStartX + detailColWidths[0] + detailColWidths[1] + detailColWidths[2] + detailColWidths[3] + detailColWidths[4];
    doc.text(formatPkrAmount(grandTotal), gtX + detailColWidths[5] - 2, yPosition + 5.5, { align: 'right' });
    doc.text(formatPkrAmount(grandDocShare), gtX + detailColWidths[5] + detailColWidths[6] - 2, yPosition + 5.5, { align: 'right' });
    doc.text(formatPkrAmount(grandHosShare), gtX + detailColWidths[5] + detailColWidths[6] + detailColWidths[7] - 2, yPosition + 5.5, { align: 'right' });
    yPosition += 15;
  }

  // Only show additional sections when not filtering by category
  if (!activeCategoryFilter) {
  // ===========================================
  // DOCTOR SUMMARY SECTION
  // ===========================================
  drawSectionHeader('DOCTOR SUMMARY');

  // Aggregate revenue per doctor from OPD invoices and OT schedules
  const doctorRevenueMap = new Map<string, { name: string; opdCount: number; opdRevenue: number; otCount: number; otRevenue: number }>();

  // OPD consultations — group by doctor_id from invoices
  hospitalInvoicesAll
    .filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv))
    .forEach((inv: any) => {
      const doctorId = inv.doctor_id || 'unknown';
      const existing = doctorRevenueMap.get(doctorId) || { name: '', opdCount: 0, opdRevenue: 0, otCount: 0, otRevenue: 0 };
      existing.opdCount += 1;
      existing.opdRevenue += Number(inv.amount) || 0;
      // Try to resolve doctor name from description (e.g. "Consultation - Dr. XYZ")
      if (!existing.name && inv.description) {
        const match = inv.description.match(/Dr\.?\s*([^-–—]+)/i);
        if (match) existing.name = `Dr. ${match[1].trim()}`;
      }
      doctorRevenueMap.set(doctorId, existing);
    });

  // OT schedules — group by doctor_id or doctor_name
  (transactionsData?.otSchedules || []).forEach((ot: any) => {
    const doctorId = ot.doctor_id || ot.doctor_name || 'unknown';
    const existing = doctorRevenueMap.get(doctorId) || { name: '', opdCount: 0, opdRevenue: 0, otCount: 0, otRevenue: 0 };
    existing.otCount += 1;
    existing.otRevenue += Number(ot.doctor_expense) || 0;
    if (!existing.name && ot.doctor_name) existing.name = ot.doctor_name;
    doctorRevenueMap.set(doctorId, existing);
  });

  // Resolve doctor names for any UUIDs we haven't resolved yet
  const unresolvedDoctorIds = Array.from(doctorRevenueMap.keys()).filter(id => uuidRegex.test(id) && !doctorRevenueMap.get(id)?.name);
  if (unresolvedDoctorIds.length > 0) {
    const { data: doctorProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', unresolvedDoctorIds);
    (doctorProfiles || []).forEach((p: any) => {
      const entry = doctorRevenueMap.get(p.id);
      if (entry) entry.name = `Dr. ${p.first_name || ''} ${p.last_name || ''}`.trim();
    });
  }

  const doctorSummaryEntries = Array.from(doctorRevenueMap.values())
    .filter(d => d.opdRevenue > 0 || d.otRevenue > 0)
    .sort((a, b) => (b.opdRevenue + b.otRevenue) - (a.opdRevenue + a.otRevenue));

  if (doctorSummaryEntries.length > 0) {
    const docSumHeaders = ['Sr#', 'Doctor Name', 'OPD Patients', 'OPD Revenue', 'OT Cases', 'OT Revenue', 'Total Revenue'];
    const docSumColWidths = [8, 45, 20, 28, 18, 28, 28];
    const docSumRows: string[][] = doctorSummaryEntries.map((d, i) => [
      String(i + 1),
      d.name || 'Unknown',
      String(d.opdCount),
      formatPkrAmount(d.opdRevenue),
      String(d.otCount),
      formatPkrAmount(d.otRevenue),
      formatPkrAmount(d.opdRevenue + d.otRevenue),
    ]);

    // Add totals row
    const totalOpdCount = doctorSummaryEntries.reduce((s, d) => s + d.opdCount, 0);
    const totalOpdRev = doctorSummaryEntries.reduce((s, d) => s + d.opdRevenue, 0);
    const totalOtCount = doctorSummaryEntries.reduce((s, d) => s + d.otCount, 0);
    const totalOtRev = doctorSummaryEntries.reduce((s, d) => s + d.otRevenue, 0);
    docSumRows.push(['', 'TOTAL', String(totalOpdCount), formatPkrAmount(totalOpdRev), String(totalOtCount), formatPkrAmount(totalOtRev), formatPkrAmount(totalOpdRev + totalOtRev)]);

    drawTable(docSumHeaders, docSumRows, docSumColWidths);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No doctor revenue recorded for this period.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
  }

  // ===========================================
  // STAFF COLLECTION SUMMARY
  // ===========================================
  drawSectionHeader('STAFF COLLECTION SUMMARY');

  // Aggregate by operator
  const staffCollectionMap = new Map<string, { name: string; count: number; total: number; opd: number; lab: number; xray: number; ot: number; emergency: number; misc: number }>();
  allTxns.forEach(txn => {
    const op = txn.operator && txn.operator !== '—' ? txn.operator : 'Unattributed';
    const existing = staffCollectionMap.get(op) || { name: op, count: 0, total: 0, opd: 0, lab: 0, xray: 0, ot: 0, emergency: 0, misc: 0 };
    existing.count += 1;
    existing.total += txn.amount;
    if (txn.category === 'OPD') existing.opd += txn.amount;
    else if (txn.category === 'Lab') existing.lab += txn.amount;
    else if (txn.category === 'X-Ray') existing.xray += txn.amount;
    else if (txn.category === 'OT') existing.ot += txn.amount;
    else if (txn.category === 'Emergency') existing.emergency += txn.amount;
    else if (txn.category === 'Miscellaneous') existing.misc += txn.amount;
    staffCollectionMap.set(op, existing);
  });

  const staffEntries = Array.from(staffCollectionMap.values()).sort((a, b) => b.total - a.total);

  if (staffEntries.length > 0) {
    const staffHeaders = ['Sr#', 'Staff Name', 'OPD', 'Lab', 'X-Ray', 'OT', 'Emergency', 'Total'];
    const staffColWidths = [8, 40, 22, 22, 22, 22, 22, 28];
    const staffRows: string[][] = staffEntries.map((s, i) => [
      String(i + 1),
      s.name,
      s.opd ? formatPkrAmount(s.opd) : '—',
      s.lab ? formatPkrAmount(s.lab) : '—',
      s.xray ? formatPkrAmount(s.xray) : '—',
      s.ot ? formatPkrAmount(s.ot) : '—',
      s.emergency ? formatPkrAmount(s.emergency) : '—',
      formatPkrAmount(s.total)
    ]);
    const totals = staffEntries.reduce((acc, e) => ({
      opd: acc.opd + e.opd, lab: acc.lab + e.lab, xray: acc.xray + e.xray,
      ot: acc.ot + e.ot, emergency: acc.emergency + e.emergency, total: acc.total + e.total
    }), { opd: 0, lab: 0, xray: 0, ot: 0, emergency: 0, total: 0 });
    staffRows.push([
      '', 'TOTAL',
      totals.opd ? formatPkrAmount(totals.opd) : '—',
      totals.lab ? formatPkrAmount(totals.lab) : '—',
      totals.xray ? formatPkrAmount(totals.xray) : '—',
      totals.ot ? formatPkrAmount(totals.ot) : '—',
      totals.emergency ? formatPkrAmount(totals.emergency) : '—',
      formatPkrAmount(totals.total)
    ]);
    drawTable(staffHeaders, staffRows, staffColWidths);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No staff-attributed transactions for this period.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
  }

  // ===========================================
  // EXPENSES DETAIL SECTION
  // ===========================================
  const expenseCount = transactionsData?.expenses?.length || 0;
  drawSectionHeader(`EXPENSES (${expenseCount})`);

  const detailedTotalExpenses = expenseCount > 0
    ? transactionsData.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    : Number(data.totalExpenses || 0);

  if (expenseCount > 0) {
    const expenseHeaders = ['Sr#', 'Category', 'Description / Bill', 'Date & Time', 'Amount'];
    const expenseColWidths = [10, 35, 65, 30, 30];
    const expenseRows: string[][] = transactionsData.expenses.map((exp: any, i: number) => [
      String(i + 1),
      exp.category || '—',
      exp.description || '—',
      exp.created_at ? formatTime(exp.created_at) + ' ' + new Date(exp.expense_date).toLocaleDateString() : new Date(exp.expense_date).toLocaleDateString(),
      formatPkrAmount(exp.amount)
    ]);

    expenseRows.push(['', '', '', 'Total Expenses:', formatPkrAmount(detailedTotalExpenses)]);
    drawTable(expenseHeaders, expenseRows, expenseColWidths);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No expenses recorded for this period', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
  }

  // ===========================================
  // REFUNDS DETAIL SECTION
  // ===========================================
  const refundCount = transactionsData?.refunds?.length || 0;
  drawSectionHeader(`REFUNDS & RETURNS (${refundCount})`);

  const detailedTotalRefunds = refundCount > 0
    ? transactionsData.refunds.reduce((s: number, r: any) => s + (r.amount || 0), 0)
    : Number(data.totalRefunds || 0);

  if (refundCount > 0) {
    const refundHeaders = ['Sr#', 'Refund Type', 'Description / Bill Reference', 'Date & Time', 'Amount'];
    const refundColWidths = [10, 35, 65, 30, 30];
    const refundRows: string[][] = transactionsData.refunds.map((ref: any, i: number) => [
      String(i + 1),
      (ref.refund_type || '').replace(/_/g, ' '),
      ref.description || '—',
      ref.created_at ? formatTime(ref.created_at) + ' ' + new Date(ref.created_at).toLocaleDateString() : '—',
      formatPkrAmount(ref.amount)
    ]);

    refundRows.push(['', '', '', 'Total Refunds:', formatPkrAmount(detailedTotalRefunds)]);
    drawTable(refundHeaders, refundRows, refundColWidths);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No refunds recorded for this period', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
  }

  // ===========================================
  // DISCOUNTS SECTION
  // ===========================================
  const discountItems: { patient: string; service: string; original: number; discounted: number; discount: number }[] = [];

  (transactionsData?.labReports || []).forEach((lab: any) => {
    const originalPrice = Number(lab.price) || 0;
    const invoiceAmount = lab.invoice_amount != null ? Number(lab.invoice_amount) : null;
    const finalAmount = invoiceAmount != null ? invoiceAmount : originalPrice;
    if (originalPrice > 0 && finalAmount < originalPrice) {
      const p = lab.patients?.profiles;
      discountItems.push({
        patient: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
        service: `Lab - ${lab.test_name || 'Test'}`,
        original: originalPrice,
        discounted: finalAmount,
        discount: originalPrice - finalAmount,
      });
    }
  });

  (transactionsData?.xrayReports || []).forEach((xray: any) => {
    const originalPrice = Number(xray.price) || 0;
    const finalAmount = Number(xray.amount) || originalPrice;
    if (originalPrice > 0 && finalAmount < originalPrice) {
      const p = (xray as any).patients?.profiles;
      discountItems.push({
        patient: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
        service: `X-Ray - ${xray.test_name || 'X-Ray'}`,
        original: originalPrice,
        discounted: finalAmount,
        discount: originalPrice - finalAmount,
      });
    }
  });

  hospitalInvoicesAll
    .filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv))
    .forEach((inv: any) => {
      const originalAmt = Number(inv.original_amount) || 0;
      const finalAmt = Number(inv.amount) || 0;
      if (originalAmt > 0 && finalAmt < originalAmt) {
        discountItems.push({
          patient: inv.description || 'OPD',
          service: 'OPD Consultation',
          original: originalAmt,
          discounted: finalAmt,
          discount: originalAmt - finalAmt,
        });
      }
    });

  if (discountItems.length > 0) {
    drawSectionHeader(`DISCOUNTS APPLIED (${discountItems.length})`);
    const discountHeaders = ['Sr#', 'Patient', 'Service', 'Original', 'Discount', 'Final Amount'];
    const discountColWidths = [8, 40, 40, 28, 28, 28];
    const discountRows: string[][] = discountItems.map((d, i) => [
      String(i + 1),
      d.patient,
      d.service,
      formatPkrAmount(d.original),
      `-${formatPkrAmount(d.discount)}`,
      formatPkrAmount(d.discounted),
    ]);
    const totalDiscount = discountItems.reduce((s, d) => s + d.discount, 0);
    discountRows.push(['', '', '', '', 'Total Discount:', formatPkrAmount(totalDiscount)]);
    drawTable(discountHeaders, discountRows, discountColWidths);
  }

  // ===========================================
  // NET SUMMARY SECTION
  // ===========================================
  drawSectionHeader('NET SUMMARY');
  const hospitalNetFromDetailed = grandHosShare - detailedTotalExpenses - detailedTotalRefunds;

  drawTable(
    ['Hos. Share', 'Doc. Share', 'Expenses', 'Refunds', 'Hospital Net Profit'],
    [[
      formatPkrAmount(grandHosShare),
      formatPkrAmount(grandDocShare),
      `(${formatPkrAmount(detailedTotalExpenses)})`,
      `(${formatPkrAmount(detailedTotalRefunds)})`,
      formatPkrAmount(hospitalNetFromDetailed)
    ]],
    [34, 34, 30, 30, 42]
  );

  // ===========================================
  // PHARMACY SECTION
  // ===========================================
  drawSectionHeader('PHARMACY TRANSACTIONS');

  if (transactionsData?.pharmacyInvoices?.length > 0) {
    const positiveInvoices = transactionsData.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) >= 0);
    const negativeInvoices = transactionsData.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) < 0);
    
    const salesCount = positiveInvoices.length;
    const returnsCount = negativeInvoices.length;
    const grossSalesRevenue = positiveInvoices.reduce((sum: number, inv: any) => sum + (inv.final_amount || 0), 0);
    const returnsAmount = Math.abs(negativeInvoices.reduce((sum: number, inv: any) => sum + (inv.final_amount || 0), 0));
    const netRevenue = grossSalesRevenue - returnsAmount;
    
    const grossProfit = positiveInvoices.reduce((totalProfit: number, invoice: any) => {
      return totalProfit + (invoice.pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
        if (item.medicines?.selling_price && item.medicines?.purchase_price) {
          return itemsProfit + ((item.medicines.selling_price - item.medicines.purchase_price) * item.quantity);
        }
        return itemsProfit;
      }, 0);
    }, 0);
    
    const profitLostInReturns = negativeInvoices.reduce((totalProfit: number, invoice: any) => {
      return totalProfit + (invoice.pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
        if (item.medicines?.selling_price && item.medicines?.purchase_price) {
          return itemsProfit + ((item.medicines.selling_price - item.medicines.purchase_price) * Math.abs(item.quantity));
        }
        return itemsProfit;
      }, 0);
    }, 0);
    
    const netProfit = grossProfit - profitLostInReturns;
    
    const pharmacySummaryHeaders = ['Summary', 'Count', 'Amount'];
    const pharmacySummaryColWidths = [80, 30, 40];
    const pharmacySummaryRows = [
      ['Gross Sales Revenue', salesCount.toString(), formatPkrAmount(grossSalesRevenue)],
      ['Returns Amount', returnsCount.toString(), `(${formatPkrAmount(returnsAmount)})`],
      ['Net Revenue', '-', formatPkrAmount(netRevenue)],
      ['Gross Profit', '-', formatPkrAmount(grossProfit)],
      ['Profit Lost in Returns', '-', `(${formatPkrAmount(profitLostInReturns)})`],
      ['Net Profit', '-', formatPkrAmount(netProfit)]
    ];

    drawTable(pharmacySummaryHeaders, pharmacySummaryRows, pharmacySummaryColWidths);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No pharmacy transactions recorded for this date.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Pharmacy Expenses
  if (transactionsData?.pharmacyExpenses?.length > 0) {
    drawSectionHeader('PHARMACY EXPENSES');
    const pharmacyBillHeaders = ['Type', 'Bill No.', 'Description', 'Amount', 'Date'];
    const pharmacyBillColWidths = [35, 25, 55, 30, 25];
    const pharmacyBillRows: string[][] = transactionsData.pharmacyExpenses.map((expense: any) => [
      expense.expense_type === 'hospital_profit_withdrawal' ? 'Profit Withdrawal' : 'Bill Payment',
      expense.bill_number || 'N/A',
      expense.description || '',
      formatPkrAmount(expense.amount),
      new Date(expense.expense_date).toLocaleDateString()
    ]);
    drawTable(pharmacyBillHeaders, pharmacyBillRows, pharmacyBillColWidths);
  }

  // ===========================================
  // FINANCIAL SUMMARY SECTION
  // ===========================================
  checkNewPage(100);
  drawSectionHeader('FINANCIAL SUMMARY');

  // Pharmacy Account Summary
  drawSubHeader('Pharmacy Account Summary');
  const pharmacyStartingBalance = transactionsData?.pharmacyAccount?.starting_balance || 0;
  const pharmacyExpenses = transactionsData?.pharmacyExpenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
  const netPharmacyBalance = pharmacyStartingBalance + data.pharmacyProfit - pharmacyExpenses;
  
  drawTable(
    ['Description', 'Amount'],
    [
      ['Opening Balance', formatPkrAmount(pharmacyStartingBalance)],
      ['Todays Sales Revenue', formatPkrAmount(data.pharmacyRevenue)],
      ['Todays Gross Profit', formatPkrAmount(data.pharmacyProfit)],
      ['Bills Paid Today', `(${formatPkrAmount(pharmacyExpenses)})`],
      ['Current Account Balance', formatPkrAmount(netPharmacyBalance)],
      ['Total Medicines Stock Value', formatPkrAmount(transactionsData?.totalStockValue || 0)]
    ],
    [130, 50]
  );
  
  yPosition += 15;

  // Overall Summary
  drawSubHeader('Overall Daily Summary');
  
  const correctLabRevenue = hospitalInvoicesAll
    .filter((inv: any) => inv.invoice_number?.startsWith?.('LAB-'))
    .reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
  const correctXrayRevenue = transactionsData?.xrayReports?.reduce((sum: number, xray: any) => sum + (xray.price || 0), 0) || 0;
  const correctOtRevenue = transactionsData?.otSchedules?.reduce((sum: number, ot: any) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0) || 0;
  const emergencyAppointmentRevenue = transactionsData?.emergencyAppointments?.reduce((sum: number, e: any) => sum + (e.consultation_fee_at_time || 0), 0) || 0;
  const emergencyInvoiceRevenue = hospitalInvoicesAll.filter(isEmergencyInv).reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
  const totalEmergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;
  const correctMiscIncome = transactionsData?.miscellaneousIncome?.reduce((sum: number, income: any) => sum + (income.amount || 0), 0) || 0;
  const correctHospitalServicesRevenue = correctLabRevenue + correctXrayRevenue + correctOtRevenue + totalEmergencyRevenue + correctMiscIncome;

  const doctorConsultationRevenue = hospitalInvoicesAll
    .filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv))
    .reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
  const doctorOTExpense = transactionsData?.otSchedules?.reduce((sum: number, ot: any) => sum + (ot.doctor_expense || 0), 0) || 0;
  const totalDoctorRevenue = doctorConsultationRevenue + doctorOTExpense;

  drawTable(
    ['Description', 'Amount'],
    [
      ['Hospital Services Revenue', formatPkrAmount(correctHospitalServicesRevenue)],
      ['Doctor Revenue (Consultation + OT Fees)', formatPkrAmount(totalDoctorRevenue)],
      ['Pharmacy Revenue', formatPkrAmount(data.pharmacyRevenue)],
      ['Pharmacy Profit', formatPkrAmount(data.pharmacyProfit)],
      ['Total Daily Expenses', `(${formatPkrAmount(data.totalExpenses)})`],
      ['Total Refunds and Returns', `(${formatPkrAmount(data.totalRefunds)})`]
    ],
    [130, 50]
  );

  // ===========================================
  // HOSPITAL CLOSING BALANCE CALCULATION
  // ===========================================
  checkNewPage(120);
  drawSectionHeader('HOSPITAL CLOSING BALANCE CALCULATION');

  const computedHospitalRevenue = correctHospitalServicesRevenue;
  const hospitalNetProfit = computedHospitalRevenue - data.totalExpenses - data.totalRefunds;
  const newClosingBalance = previousClosingBalance + hospitalNetProfit;

  drawTable(
    ['Description', 'Amount'],
    [
      ['Opening Balance (Previous Day)', formatPkrAmount(previousClosingBalance)],
      ['Todays Hospital Revenue', formatPkrAmount(computedHospitalRevenue)],
      ['Todays Hospital Expenses', `(${formatPkrAmount(data.totalExpenses)})`],
      ['Todays Refunds', `(${formatPkrAmount(data.totalRefunds)})`],
      ['Todays Hospital Net Profit/Loss', formatPkrAmount(hospitalNetProfit)]
    ],
    [130, 50]
  );

  // New Closing Balance box
  yPosition += 15;
  doc.setFillColor(240, 255, 240);
  doc.setDrawColor(100, 200, 100);
  doc.setLineWidth(2);
  doc.rect(20, yPosition - 5, pageWidth - 40, 20, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 0);
  doc.text('NEW CLOSING BALANCE:', 30, yPosition + 8);
  doc.text(formatPkrAmount(newClosingBalance), pageWidth - 30, yPosition + 8, { align: 'right' });
  yPosition += 35;

  // Save closing balance (only for new closings)
  if (!data.transactionsData) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: existingDateRecord } = await supabase
        .from('hospital_closing_balance')
        .select('id')
        .eq('closing_date', data.closingDate)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDateRecord) {
        await supabase.from('hospital_closing_balance').update({
          closing_balance: newClosingBalance,
          notes: `Updated from daily closing on ${data.closingDate}`,
          updated_at: new Date().toISOString()
        }).eq('id', existingDateRecord.id);
      } else {
        await supabase.from('hospital_closing_balance').insert({
          closing_date: data.closingDate,
          closing_balance: newClosingBalance,
          notes: `First closing balance created on ${data.closingDate}`
        });
      }
    } catch (error) {
      console.error('Error updating closing balance:', error);
    }
  }

  } // end if (!activeCategoryFilter)

  // ===========================================
  // PROOF ATTACHMENTS SECTION (split by category)
  // ===========================================
  const expenseProofs: { description: string; amount: number; proofUrl: string }[] = [];
  const refundProofs: { description: string; amount: number; proofUrl: string }[] = [];

  (transactionsData?.expenses || []).forEach((exp: any) => {
    if (exp.proof_url) {
      expenseProofs.push({
        description: exp.description || exp.category || 'Expense',
        amount: exp.amount || 0,
        proofUrl: exp.proof_url,
      });
    }
  });

  (transactionsData?.refunds || []).forEach((ref: any) => {
    if (ref.proof_url) {
      refundProofs.push({
        description: ref.description || ref.refund_type || 'Refund',
        amount: ref.amount || 0,
        proofUrl: ref.proof_url,
      });
    }
  });

  // Helper to render a group of proof images
  const renderProofGroup = async (title: string, items: { description: string; amount: number; proofUrl: string }[]) => {
    if (items.length === 0) return;

    if (yPosition + 30 > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }

    // Sub-header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 2, pageWidth - 30, 12, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPosition - 2, pageWidth - 30, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`${title} (${items.length})`, pageWidth / 2, yPosition + 6, { align: 'center' });
    yPosition += 18;

    for (let pi = 0; pi < items.length; pi++) {
      const proof = items[pi];

      if (yPosition + 100 > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(`${pi + 1}. ${proof.description} — ${formatPkrAmount(proof.amount)}`, 20, yPosition);
      yPosition += 6;

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 8000);
          img.src = proof.proofUrl;
        });

        if (loaded && img.width > 0 && img.height > 0) {
          const maxW = 160;
          const maxH = 80;
          let imgW = img.width;
          let imgH = img.height;
          const scale = Math.min(maxW / imgW, maxH / imgH, 1);
          imgW = imgW * scale;
          imgH = imgH * scale;
          const mmW = Math.min(imgW, maxW);
          const mmH = Math.min(imgH, maxH);

          if (yPosition + mmH + 10 > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.3);
          doc.rect(19, yPosition - 1, mmW + 2, mmH + 2);
          doc.addImage(img, 'JPEG', 20, yPosition, mmW, mmH);
          yPosition += mmH + 8;
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('(Proof image could not be loaded)', 25, yPosition);
          yPosition += 8;
        }
      } catch (error) {
        console.error('Error loading proof image for PDF:', error);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('(Proof image could not be loaded)', 25, yPosition);
        yPosition += 8;
      }
    }
  };

  // ===========================================
  // STAFF SHIFT CLOSINGS & OVERTIME SECTION
  // ===========================================
  const { data: staffShiftClosings } = await supabase
    .from('staff_shift_closings')
    .select('*')
    .eq('closing_date', data.closingDate)
    .order('created_at', { ascending: true });

  if (staffShiftClosings && staffShiftClosings.length > 0) {
    // Fetch staff profiles for names
    const staffIds = [...new Set(staffShiftClosings.map((c: any) => c.staff_id))];
    let staffProfilesMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', staffIds);
      (profiles || []).forEach((p: any) => {
        staffProfilesMap[p.id] = `${p.first_name} ${p.last_name}`;
      });
    }

    doc.addPage();
    yPosition = 20;

    // Section header
    doc.setFillColor(109, 40, 217); // Purple
    doc.rect(20, yPosition, pageWidth - 40, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('STAFF SHIFT CLOSINGS & OVERTIME', pageWidth / 2, yPosition + 7, { align: 'center' });
    yPosition += 16;

    // Table header
    const staffColX = [20, 65, 95, 125, 150, 170];
    const staffColLabels = ['Staff Name', 'Shift', 'Revenue', 'Invoices', 'OT Hours', 'OT Amount'];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPosition - 4, pageWidth - 40, 8, 'F');
    staffColLabels.forEach((label, i) => {
      doc.text(label, staffColX[i], yPosition);
    });
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    let totalOTHours = 0;
    let totalOTAmount = 0;

    for (const closing of staffShiftClosings) {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      const staffName = staffProfilesMap[closing.staff_id] || 'Unknown';
      const otHours = Number(closing.overtime_hours) || 0;
      const otAmount = Number(closing.overtime_amount) || 0;
      totalOTHours += otHours;
      totalOTAmount += otAmount;

      doc.text(staffName.substring(0, 20), staffColX[0], yPosition);
      doc.text(String(closing.shift || '-'), staffColX[1], yPosition);
      doc.text(formatPkrAmount(Number(closing.total_revenue) || 0), staffColX[2], yPosition);
      doc.text(String(closing.total_invoices || 0), staffColX[3], yPosition);
      doc.text(otHours > 0 ? `${otHours}h` : '-', staffColX[4], yPosition);
      doc.text(otAmount > 0 ? formatPkrAmount(otAmount) : '-', staffColX[5], yPosition);
      yPosition += 7;
    }

    // Totals row
    yPosition += 2;
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Staff: ${staffShiftClosings.length}`, staffColX[0], yPosition);
    doc.text(`Total OT: ${totalOTHours}h`, staffColX[4], yPosition);
    doc.text(totalOTAmount > 0 ? formatPkrAmount(totalOTAmount) : '-', staffColX[5], yPosition);
    yPosition += 10;
  }

  if (expenseProofs.length > 0 || refundProofs.length > 0) {
    doc.addPage();
    yPosition = 20;
    await renderProofGroup('EXPENSE PROOFS', expenseProofs);
    await renderProofGroup('REFUND PROOFS', refundProofs);
  }

  // Footer
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

// =============================================
// SUMMARY DAILY CLOSING PDF (no patient names)
// =============================================
export const generateDailyClosingSummaryPDF = async (data: {
  closingDate: string;
  closingTime: string;
  dayName: string;
  hospitalRevenue: number;
  pharmacyRevenue: number;
  pharmacyProfit: number;
  totalExpenses: number;
  totalRefunds: number;
  netProfit: number;
  transactionsData?: any;
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Resolve transaction data
  let transactionsData = data.transactionsData;
  if (!transactionsData) {
    transactionsData = await queryTransactionDataForDate(data.closingDate, data.closingTime);
  }

  // Get previous closing balance
  let previousClosingBalance = 0;
  const { data: prevBalanceRecord } = await supabase
    .from('hospital_closing_balance')
    .select('closing_balance')
    .lt('closing_date', data.closingDate)
    .order('closing_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prevBalanceRecord) previousClosingBalance = Number(prevBalanceRecord.closing_balance || 0);

  // Header
  await addHospitalHeader(doc, 'Daily Financial Closing Report');
  yPosition += 60;

  // ========== HELPERS ==========
  const checkNewPage = (space: number = 30) => {
    if (yPosition + space > pageHeight - 20) { doc.addPage(); yPosition = 20; }
  };

  const drawSectionHeader = (title: string) => {
    checkNewPage(25);
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

  const drawSubHeader = (title: string) => {
    checkNewPage(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(title, 20, yPosition);
    yPosition += 8;
  };

  const drawTable = (headers: string[], rows: string[][], colWidths: number[], startX: number = 20) => {
    const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const headerHeight = 10;
    const rowHeight = 8;

    let currentRows = [...rows];
    let isFirstPage = true;

    while (currentRows.length > 0) {
      if (!isFirstPage) {
        checkNewPage(headerHeight + rowHeight + 10);
      } else {
        checkNewPage(headerHeight + (2 * rowHeight) + 10);
      }

      const availableRows = Math.floor((pageHeight - yPosition - 40) / rowHeight) - 1;
      const rowsToRender = Math.min(currentRows.length, availableRows);
      const pageRows = currentRows.splice(0, rowsToRender);

      let tableY = yPosition;

      // Header bg
      doc.setFillColor(50, 50, 50);
      doc.rect(startX, tableY, tableWidth, headerHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      let xPos = startX + 2;
      headers.forEach((h, i) => {
        doc.text(h, xPos, tableY + 7);
        xPos += colWidths[i];
      });
      tableY += headerHeight;

      // Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      pageRows.forEach((row, rowIndex) => {
        if (tableY + rowHeight > pageHeight - 20) return;
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
        }
        xPos = startX + 2;
        row.forEach((cell, colIndex) => {
          let displayText = cell;
          const maxLength = Math.floor(colWidths[colIndex] * 0.8);
          if (typeof cell === 'string' && cell.length > maxLength && !cell.includes('Rs.') && !cell.includes('(') && maxLength > 10) {
            displayText = cell.substring(0, maxLength - 3) + '...';
          }
          if (cell.includes('Rs.') || cell.includes('(') || (!isNaN(parseFloat(cell)) && cell.trim() !== '')) {
            doc.text(displayText, xPos + colWidths[colIndex] - 4, tableY + 6, { align: 'right' });
          } else {
            doc.text(displayText, xPos, tableY + 6);
          }
          xPos += colWidths[colIndex];
        });
        tableY += rowHeight;
      });

      // Table border & grid
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(startX, yPosition, tableWidth, tableY - yPosition);
      xPos = startX;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPos += colWidths[i];
        doc.line(xPos, yPosition, xPos, tableY);
      }
      for (let i = 0; i <= pageRows.length; i++) {
        const lineY = yPosition + headerHeight + (i * rowHeight);
        doc.line(startX, lineY, startX + tableWidth, lineY);
      }
      yPosition = tableY + 10;
      isFirstPage = false;
    }
  };

  // ========== OPENING BALANCE ==========
  drawSectionHeader('OPENING BALANCE');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(`Previous Day's Closing Balance: ${formatPkrAmount(previousClosingBalance)}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(`${data.dayName}, ${new Date(data.closingDate).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Closing Time: ${formatInPakistanTime(data.closingTime, 'PPP p')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // ========== COMPUTE DATA ==========
  const hospitalInvoicesAll = transactionsData?.hospitalInvoices || [];
  const isEmergencyInv = (inv: any) =>
    inv.description?.toLowerCase().includes('emergency') ||
    inv.emergency_patient_data ||
    inv.invoice_number?.startsWith('EMG-') ||
    inv.invoice_number?.startsWith('EMERGENCY-');

  const labReports = transactionsData?.labReports || [];
  const labRevenue = labReports.reduce((s: number, r: any) => s + (r.invoice_amount != null ? Number(r.invoice_amount) : (Number(r.price) || 0)), 0);

  const xrayReports = transactionsData?.xrayReports || [];
  const xrayRevenue = xrayReports.reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);

  const otSchedules = transactionsData?.otSchedules || [];
  const otTotalCost = otSchedules.reduce((s: number, ot: any) => s + (Number(ot.total_cost) || 0), 0);
  const otDoctorExp = otSchedules.reduce((s: number, ot: any) => s + (Number(ot.doctor_expense) || 0), 0);
  const otHosShare = otTotalCost - otDoctorExp;

  const emergencyInvRevenue = hospitalInvoicesAll.filter(isEmergencyInv)
    .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const emergencyAptRevenue = (transactionsData?.emergencyAppointments || [])
    .reduce((s: number, e: any) => s + (Number(e.consultation_fee_at_time) || 0), 0);
  const totalEmergency = emergencyInvRevenue + emergencyAptRevenue;
  const emergencyCount = hospitalInvoicesAll.filter(isEmergencyInv).length + (transactionsData?.emergencyAppointments || []).length;

  const miscIncome = (transactionsData?.miscellaneousIncome || [])
    .reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
  const miscCount = (transactionsData?.miscellaneousIncome || []).length;

  const totalHosShare = totalEmergency + labRevenue + xrayRevenue + otHosShare + miscIncome;

  // OPD consultation revenue
  const opdInvoices = hospitalInvoicesAll.filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv));
  const opdRevenue = opdInvoices.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const totalDocShare = opdRevenue + otDoctorExp;

  // ========== PHARMACY TRANSACTIONS ==========
  drawSectionHeader('PHARMACY TRANSACTIONS');

  if (transactionsData?.pharmacyInvoices?.length > 0) {
    const posInv = transactionsData.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) >= 0);
    const negInv = transactionsData.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) < 0);
    const grossSales = posInv.reduce((s: number, inv: any) => s + (inv.final_amount || 0), 0);
    const returns = Math.abs(negInv.reduce((s: number, inv: any) => s + (inv.final_amount || 0), 0));

    const grossProfit = posInv.reduce((totalProfit: number, invoice: any) => {
      return totalProfit + (invoice.pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
        if (item.medicines?.selling_price && item.medicines?.purchase_price) {
          return itemsProfit + ((item.medicines.selling_price - item.medicines.purchase_price) * item.quantity);
        }
        return itemsProfit;
      }, 0);
    }, 0);

    const profitLostInReturns = negInv.reduce((totalProfit: number, invoice: any) => {
      return totalProfit + (invoice.pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
        if (item.medicines?.selling_price && item.medicines?.purchase_price) {
          return itemsProfit + ((item.medicines.selling_price - item.medicines.purchase_price) * Math.abs(item.quantity));
        }
        return itemsProfit;
      }, 0);
    }, 0);

    const netProfit = grossProfit - profitLostInReturns;

    drawTable(
      ['Summary', 'Count', 'Amount'],
      [
        ['Gross Sales Revenue', posInv.length.toString(), formatPkrAmount(grossSales)],
        ['Returns Amount', negInv.length.toString(), `(${formatPkrAmount(returns)})`],
        ['Net Revenue', '-', formatPkrAmount(grossSales - returns)],
        ['Gross Profit', '-', formatPkrAmount(grossProfit)],
        ['Profit Lost in Returns', '-', `(${formatPkrAmount(profitLostInReturns)})`],
        ['Net Profit', '-', formatPkrAmount(netProfit)]
      ],
      [80, 30, 40]
    );
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No pharmacy transactions recorded for this date.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // ========== HOSPITAL SERVICES ==========
  drawSectionHeader('HOSPITAL SERVICES');

  drawTable(
    ['Service Type', 'Count', 'Revenue'],
    [
      ['Laboratory Tests', labReports.length.toString(), formatPkrAmount(labRevenue)],
      ['X-Ray Reports', xrayReports.length.toString(), formatPkrAmount(xrayRevenue)],
      ['OT / Operations (Hos. Share)', otSchedules.length.toString(), formatPkrAmount(otHosShare)],
      ['Emergency', emergencyCount.toString(), formatPkrAmount(totalEmergency)],
      ['Miscellaneous Income', miscCount.toString(), formatPkrAmount(miscIncome)],
      ['Total Hospital Services', '', formatPkrAmount(totalHosShare)]
    ],
    [80, 30, 40]
  );

  // ========== DOCTOR REVENUE ==========
  drawSectionHeader('DOCTOR REVENUE');

  // Build per-doctor breakdown
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const doctorMap = new Map<string, { name: string; opdCount: number; opdRev: number; otCount: number; otRev: number }>();

  opdInvoices.forEach((inv: any) => {
    const did = inv.doctor_id || 'unknown';
    const e = doctorMap.get(did) || { name: '', opdCount: 0, opdRev: 0, otCount: 0, otRev: 0 };
    e.opdCount++; e.opdRev += Number(inv.amount) || 0;
    if (!e.name && inv.description) {
      const m = inv.description.match(/(?:Dr\.?\s*)(.+)/i);
      if (m) e.name = `Dr. ${m[1].trim()}`;
    }
    doctorMap.set(did, e);
  });

  otSchedules.forEach((ot: any) => {
    const did = ot.doctor_id || ot.doctor_name || 'unknown';
    const e = doctorMap.get(did) || { name: '', opdCount: 0, opdRev: 0, otCount: 0, otRev: 0 };
    e.otCount++; e.otRev += Number(ot.doctor_expense) || 0;
    if (!e.name && ot.doctor_name) e.name = ot.doctor_name;
    doctorMap.set(did, e);
  });

  // Resolve names for UUID keys
  const unresolvedIds = Array.from(doctorMap.keys()).filter(id => uuidRegex.test(id) && !doctorMap.get(id)?.name);
  if (unresolvedIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', unresolvedIds);
    (profiles || []).forEach((p: any) => {
      const e = doctorMap.get(p.id);
      if (e) e.name = `Dr. ${p.first_name || ''} ${p.last_name || ''}`.trim();
    });
  }

  const docEntries = Array.from(doctorMap.values())
    .filter(d => d.opdRev > 0 || d.otRev > 0)
    .sort((a, b) => (b.opdRev + b.otRev) - (a.opdRev + a.otRev));

  if (docEntries.length > 0) {
    const docRows: string[][] = docEntries.map((d, i) => [
      String(i + 1),
      d.name || 'Unknown',
      d.opdCount.toString(),
      formatPkrAmount(d.opdRev),
      d.otCount.toString(),
      formatPkrAmount(d.otRev),
      formatPkrAmount(d.opdRev + d.otRev)
    ]);
    // Total row
    const totalOpdCount = docEntries.reduce((s, d) => s + d.opdCount, 0);
    const totalOtCount = docEntries.reduce((s, d) => s + d.otCount, 0);
    docRows.push([
      '',
      'TOTAL',
      totalOpdCount.toString(),
      formatPkrAmount(docEntries.reduce((s, d) => s + d.opdRev, 0)),
      totalOtCount.toString(),
      formatPkrAmount(docEntries.reduce((s, d) => s + d.otRev, 0)),
      formatPkrAmount(totalDocShare)
    ]);

    drawTable(
      ['Sr#', 'Doctor Name', 'OPD Patients', 'OPD Revenue', 'OT Cases', 'OT Revenue', 'Total Revenue'],
      docRows,
      [8, 45, 20, 28, 18, 28, 28]
    );
  } else {
    // Fallback summary
    drawTable(
      ['Revenue Type', 'Count', 'Amount'],
      [
        ['Consultation Fees', opdInvoices.length.toString(), formatPkrAmount(opdRevenue)],
        ['OT Doctor Fees', otSchedules.length.toString(), formatPkrAmount(otDoctorExp)],
        ['Total Doctor Revenue', '', formatPkrAmount(totalDocShare)]
      ],
      [80, 30, 40]
    );
  }

  // ========== EXPENSES ==========
  const expenses = transactionsData?.expenses || [];
  const totalExp = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

  if (expenses.length > 0) {
    drawSectionHeader(`EXPENSES (${expenses.length})`);
    const expRows: string[][] = expenses.map((e: any) => [
      e.category || '',
      e.description || '',
      formatPkrAmount(e.amount)
    ]);
    expRows.push(['', 'Total Expenses', formatPkrAmount(totalExp)]);
    drawTable(['Category', 'Description', 'Amount'], expRows, [40, 80, 40]);
  }

  // ========== REFUNDS ==========
  const refunds = transactionsData?.refunds || [];
  const totalRef = refunds.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

  if (refunds.length > 0) {
    drawSectionHeader(`REFUNDS (${refunds.length})`);
    const refRows: string[][] = refunds.map((r: any) => [
      (r.refund_type || '').replace(/_/g, ' '),
      r.description || '',
      formatPkrAmount(r.amount)
    ]);
    refRows.push(['', 'Total Refunds', formatPkrAmount(totalRef)]);
    drawTable(['Type', 'Description', 'Amount'], refRows, [40, 80, 40]);
  }

  // ========== FINANCIAL SUMMARY ==========
  checkNewPage(100);
  drawSectionHeader('FINANCIAL SUMMARY');

  // Pharmacy Account Summary
  drawSubHeader('Pharmacy Account Summary');
  const pharmacyStartingBalance = transactionsData?.pharmacyAccount?.starting_balance || 0;
  const pharmacyExpenses = transactionsData?.pharmacyExpenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
  const netPharmacyBalance = pharmacyStartingBalance + data.pharmacyProfit - pharmacyExpenses;

  drawTable(
    ['Description', 'Amount'],
    [
      ['Opening Balance', formatPkrAmount(pharmacyStartingBalance)],
      ['Todays Sales Revenue', formatPkrAmount(data.pharmacyRevenue)],
      ['Todays Gross Profit', formatPkrAmount(data.pharmacyProfit)],
      ['Bills Paid Today', `(${formatPkrAmount(pharmacyExpenses)})`],
      ['Current Account Balance', formatPkrAmount(netPharmacyBalance)],
      ['Total Medicines Stock Value', formatPkrAmount(transactionsData?.totalStockValue || 0)]
    ],
    [130, 50]
  );

  yPosition += 5;

  // Overall Daily Summary
  drawSubHeader('Overall Daily Summary');

  drawTable(
    ['Description', 'Amount'],
    [
      ['Hospital Services Revenue', formatPkrAmount(totalHosShare)],
      ['Doctor Revenue (Consultation + OT Fees)', formatPkrAmount(totalDocShare)],
      ['Pharmacy Revenue', formatPkrAmount(data.pharmacyRevenue)],
      ['Pharmacy Profit', formatPkrAmount(data.pharmacyProfit)],
      ['Total Daily Expenses', `(${formatPkrAmount(totalExp)})`],
      ['Total Refunds and Returns', `(${formatPkrAmount(totalRef)})`]
    ],
    [130, 50]
  );

  // ========== HOSPITAL CLOSING BALANCE CALCULATION ==========
  checkNewPage(120);
  drawSectionHeader('HOSPITAL CLOSING BALANCE CALCULATION');

  const hospitalNetProfit = totalHosShare - totalExp - totalRef;
  const newClosingBalance = previousClosingBalance + hospitalNetProfit;

  drawTable(
    ['Description', 'Amount'],
    [
      ['Opening Balance (Previous Day)', formatPkrAmount(previousClosingBalance)],
      ['Todays Hospital Revenue', formatPkrAmount(totalHosShare)],
      ['Todays Hospital Expenses', `(${formatPkrAmount(totalExp)})`],
      ['Todays Refunds', `(${formatPkrAmount(totalRef)})`],
      ['Todays Hospital Net Profit/Loss', formatPkrAmount(hospitalNetProfit)]
    ],
    [130, 50]
  );

  // New Closing Balance box
  yPosition += 5;
  doc.setFillColor(240, 255, 240);
  doc.setDrawColor(100, 200, 100);
  doc.setLineWidth(2);
  doc.rect(20, yPosition - 5, pageWidth - 40, 20, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 0);
  doc.text('NEW CLOSING BALANCE:', 30, yPosition + 8);
  doc.text(formatPkrAmount(newClosingBalance), pageWidth - 30, yPosition + 8, { align: 'right' });
  yPosition += 35;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Doctor consultation fees are excluded from hospital closing balance.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('This is a summary report. For transaction-level details, download the Detailed Report.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

// =============================================
// REFUND RECEIPT PDF
// =============================================
export const generateRefundReceiptPDF = async (data: {
  invoiceNumber: string;
  patientName: string;
  patientPhone: string;
  patientId: string;
  originalAmount: number;
  discountLabel: string;
  refundAmount: number;
  reason: string;
  billedByStaff: string;
  processedByStaff: string;
  originalDate: string;
  description: string;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  let yPosition = await addHospitalHeader(doc, 'REFUND RECEIPT');

  // Refund reference
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref: REFUND-${Date.now().toString().slice(-8)}`, pageWidth - 20, yPosition - 5, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, yPosition + 1, { align: 'right' });

  yPosition += 10;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Patient info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Patient Information', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const patientFields = [
    ['Name:', data.patientName],
    ['Patient ID:', data.patientId],
    ['Phone:', data.patientPhone],
  ];
  for (const [label, value] of patientFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 25, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPosition);
    yPosition += 7;
  }

  yPosition += 5;
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Original bill info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Original Bill Details', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const billFields = [
    ['Invoice #:', data.invoiceNumber],
    ['Description:', data.description.length > 50 ? data.description.substring(0, 50) + '...' : data.description],
    ['Bill Amount:', formatPkrAmount(data.originalAmount)],
    ['Billed On:', new Date(data.originalDate).toLocaleDateString()],
    ['Billed By:', data.billedByStaff],
  ];
  for (const [label, value] of billFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 25, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPosition);
    yPosition += 7;
  }

  yPosition += 5;
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Refund details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Refund Details', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  const refundFields = [
    ['Discount Applied:', data.discountLabel],
    ['Reason:', data.reason],
    ['Processed By:', data.processedByStaff],
  ];
  for (const [label, value] of refundFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 25, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPosition);
    yPosition += 7;
  }

  yPosition += 5;

  // Refund amount box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(20, yPosition, pageWidth - 40, 20, 3, 3, 'FD');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`Refund Amount: ${formatPkrAmount(data.refundAmount)}`, pageWidth / 2, yPosition + 13, { align: 'center' });

  yPosition += 30;

  // Footer note
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Patient may collect the above refund amount in cash from the billing counter.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

  // Signature lines
  yPosition += 20;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.line(25, yPosition, 85, yPosition);
  doc.line(pageWidth - 85, yPosition, pageWidth - 25, yPosition);
  yPosition += 5;
  doc.setFontSize(8);
  doc.text('Patient Signature', 55, yPosition, { align: 'center' });
  doc.text('Authorized Signature', pageWidth - 55, yPosition, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};
