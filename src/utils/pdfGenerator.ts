
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
    
    if (item.isHeader) {
      // Header styling
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(item.description, xPosition, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
    } else {
      // Description
      const description = item.description.length > 35 ? item.description.substring(0, 32) + '...' : item.description;
      doc.text(description, xPosition, yPosition);
      xPosition += colWidths[0];
      
      // Quantity
      doc.text(item.quantity.toString(), xPosition, yPosition);
      xPosition += colWidths[1];
      
      // Unit Price
      doc.text(formatPkrAmount(Number(item.unitPrice)), xPosition, yPosition);
      xPosition += colWidths[2];
      
      // Total Price
      doc.text(formatPkrAmount(Number(item.totalPrice)), xPosition, yPosition);
    }
    
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
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 30;

  // Add header
  await addHospitalHeader(doc, 'Daily Financial Closing Report');
  yPosition += 60;

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
      yPosition = 30;
      return true;
    }
    return false;
  };

  // Helper function to draw section header
  const drawSectionHeader = (title: string) => {
    checkNewPage(35);
    
    // Draw background for section header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 18, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPosition - 5, pageWidth - 30, 18);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(title, pageWidth / 2, yPosition + 6, { align: 'center' });
    yPosition += 25;
  };

  // Helper function to draw subsection header
  const drawSubHeader = (title: string) => {
    checkNewPage(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(title, 20, yPosition);
    yPosition += 15;
  };

  // Helper function to draw professional tables
  const drawTable = (headers: string[], rows: string[][], colWidths: number[], startX: number = 20) => {
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const headerHeight = 12;
    const rowHeight = 10;
    let tableY = yPosition;
    
    checkNewPage(headerHeight + (rows.length * rowHeight) + 10);
    tableY = yPosition;
    
    // Draw header background
    doc.setFillColor(50, 50, 50);
    doc.rect(startX, tableY, tableWidth, headerHeight, 'F');
    
    // Draw header text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    
    let xPos = startX + 3;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableY + 8);
      xPos += colWidths[i];
    });
    
    tableY += headerHeight;
    
    // Draw rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    
    rows.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(startX, tableY, tableWidth, rowHeight, 'F');
      }
      
      xPos = startX + 3;
      row.forEach((cell, colIndex) => {
        // Right align numeric values (amounts)
        if (cell.includes('Rs.') || cell.includes('(') || !isNaN(parseFloat(cell))) {
          doc.text(cell, xPos + colWidths[colIndex] - 6, tableY + 7, { align: 'right' });
        } else {
          doc.text(cell, xPos, tableY + 7);
        }
        xPos += colWidths[colIndex];
      });
      
      tableY += rowHeight;
    });
    
    // Draw table border
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.rect(startX, yPosition, tableWidth, tableY - yPosition);
    
    // Draw column lines
    xPos = startX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      xPos += colWidths[i];
      doc.line(xPos, yPosition, xPos, tableY);
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= rows.length; i++) {
      const lineY = yPosition + headerHeight + (i * rowHeight);
      doc.line(startX, lineY, startX + tableWidth, lineY);
    }
    
    yPosition = tableY + 20;
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

  // Pharmacy Summary Section First
  drawSubHeader('Pharmacy Account Summary');
  
  const pharmacySummaryHeaders = ['Description', 'Amount'];
  const pharmacySummaryColWidths = [120, 50];
  const pharmacySummaryRows = [
    ['Pharmacy Revenue', formatPkrAmount(data.pharmacyRevenue)],
    ['Pharmacy Profit', formatPkrAmount(data.pharmacyProfit)],
    ['Pharmacy Bills/Expenses', `(${formatPkrAmount(data.transactionsData?.pharmacyExpenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0)})`],
    ['Net Pharmacy Balance', formatPkrAmount(data.pharmacyProfit - (data.transactionsData?.pharmacyExpenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0))]
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

  // Net Profit - Special formatting
  yPosition += 10;
  const netProfitY = yPosition;
  
  // Draw highlighted box for net profit
  doc.setFillColor(220, 255, 220);
  doc.setDrawColor(100, 200, 100);
  doc.setLineWidth(2);
  doc.rect(20, netProfitY - 5, pageWidth - 40, 20, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 0);
  doc.text('NET PROFIT:', 30, netProfitY + 8);
  doc.text(formatPkrAmount(data.netProfit), pageWidth - 30, netProfitY + 8, { align: 'right' });

  yPosition += 35;

  // ===========================================
  // FOOTER
  // ===========================================
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Doctor consultation fees are excluded as they belong to individual doctor finances.', pageWidth / 2, yPosition, { align: 'center' });
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
