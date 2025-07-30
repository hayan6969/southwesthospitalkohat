import jsPDF from 'jspdf';

interface PrescriptionData {
  prescriptionText: string;
  patientName: string;
  appointmentDate: string;
  doctorName: string;
}

export const generatePrescriptionPDF = async (data: PrescriptionData): Promise<void> => {
  const { prescriptionText, patientName, appointmentDate, doctorName } = data;

  // Create new PDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set font
  pdf.setFont('helvetica');

  // Calculate center positions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Start from middle of page to leave space for hospital letterhead
  let yPosition = pageHeight / 3;

  // Patient information
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Patient:', 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(patientName, 50, yPosition);

  yPosition += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(appointmentDate, 50, yPosition);

  yPosition += 15;

  // Prescription title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PRESCRIPTION', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Prescription content
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  // Split prescription text into lines to handle long text
  const lines = pdf.splitTextToSize(prescriptionText, pageWidth - 40);
  
  // Add each line
  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.text(line, 20, yPosition);
    yPosition += 6;
  });

  // Doctor signature area (bottom of page)
  const bottomY = pageHeight - 40;
  
  yPosition = Math.max(yPosition + 20, bottomY);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Doctor:', 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doctorName, 50, yPosition);

  yPosition += 15;
  pdf.text('Signature: ________________________', 20, yPosition);

  // Open PDF in new tab
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Open in new tab
  const newWindow = window.open(pdfUrl, '_blank');
  if (!newWindow) {
    // If popup blocked, try to download instead
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `prescription_${patientName.replace(/\s+/g, '_')}_${appointmentDate.replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 1000);
};