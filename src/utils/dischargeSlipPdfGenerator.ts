import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface DischargeSlipData {
  name: string;
  ageSex: string;
  address: string;
  roomNo: string;
  dateOfAdmission: string;
  dateOfOperation: string;
  dateOfDischarge: string;
  consultant: string;
  diagnosis: string;
  operation: string;
  hospitalTreatment: string;
  homeTreatment: string;
}

export const generateDischargeSlipPDF = async (data: DischargeSlipData) => {
  try {
    // Fetch hospital settings
    const { data: hospitalSettings } = await supabase
      .from('hospital_settings')
      .select('*')
      .single();

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with proper wrapping
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      } else {
        pdf.text(text, x, y);
        return y + lineHeight;
      }
    };

    // Header - Hospital Logo (if available)
    if (hospitalSettings?.logo_url) {
      try {
        // Create a new image element to load the logo
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Add the actual logo image
            const logoWidth = 40;
            const logoHeight = 40;
            const logoX = (pageWidth - logoWidth) / 2;
            
            pdf.addImage(img, 'JPEG', logoX, yPosition, logoWidth, logoHeight);
            resolve(void 0);
          };
          img.onerror = () => {
            console.warn('Could not load hospital logo');
            resolve(void 0);
          };
          img.src = hospitalSettings.logo_url;
        });
        
        yPosition += 45;
      } catch (error) {
        console.warn('Could not load hospital logo:', error);
        yPosition += 15;
      }
    } else {
      yPosition += 15;
    }

    // Hospital Name
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    const hospitalName = hospitalSettings?.hospital_name || "Health Ways Hospital";
    const hospitalNameWidth = pdf.getTextWidth(hospitalName);
    pdf.text(hospitalName, (pageWidth - hospitalNameWidth) / 2, yPosition);
    yPosition += 10;

    // Discharge Slip Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    const titleWidth = pdf.getTextWidth("DISCHARGE SLIP");
    pdf.text("DISCHARGE SLIP", (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 8;

    // Hospital Contact Info
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const contactInfo = `PHONE NO: ${hospitalSettings?.contact_number || '0922-860123'} E-Mail: healthways.kohat@gmail.com`;
    const contactWidth = pdf.getTextWidth(contactInfo);
    pdf.text(contactInfo, (pageWidth - contactWidth) / 2, yPosition);
    yPosition += 15;

    // Patient Information Fields
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");

    // Name field
    pdf.text("Name:", margin, yPosition);
    pdf.line(margin + 15, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.name) {
      pdf.text(data.name, margin + 17, yPosition);
    }
    yPosition += 12;

    // Age/Sex and Address on same line
    pdf.text("Age:", margin, yPosition);
    pdf.line(margin + 12, yPosition + 1, margin + 45, yPosition + 1);
    if (data.ageSex) {
      pdf.text(data.ageSex, margin + 14, yPosition);
    }

    pdf.text("Sex:", margin + 50, yPosition);
    pdf.line(margin + 62, yPosition + 1, margin + 95, yPosition + 1);

    pdf.text("Address:", margin + 100, yPosition);
    pdf.line(margin + 120, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.address) {
      pdf.text(data.address, margin + 122, yPosition);
    }
    yPosition += 12;

    // Room No and Date of Admission
    pdf.text("Room No", margin, yPosition);
    pdf.line(margin + 20, yPosition + 1, margin + 80, yPosition + 1);
    if (data.roomNo) {
      pdf.text(data.roomNo, margin + 22, yPosition);
    }

    pdf.text("Date of Admission", margin + 85, yPosition);
    pdf.line(margin + 125, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.dateOfAdmission) {
      pdf.text(new Date(data.dateOfAdmission).toLocaleDateString(), margin + 127, yPosition);
    }
    yPosition += 12;

    // Date of Operation and Date of Discharge
    pdf.text("Date of Operation", margin, yPosition);
    pdf.line(margin + 35, yPosition + 1, margin + 100, yPosition + 1);
    if (data.dateOfOperation) {
      pdf.text(new Date(data.dateOfOperation).toLocaleDateString(), margin + 37, yPosition);
    }

    pdf.text("Date of Discharge", margin + 105, yPosition);
    pdf.line(margin + 140, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.dateOfDischarge) {
      pdf.text(new Date(data.dateOfDischarge).toLocaleDateString(), margin + 142, yPosition);
    }
    yPosition += 12;

    // Consultant
    pdf.text("Consultant", margin, yPosition);
    pdf.line(margin + 25, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.consultant) {
      pdf.text(data.consultant, margin + 27, yPosition);
    }
    yPosition += 12;

    // Diagnosis
    pdf.text("Diagnosis", margin, yPosition);
    pdf.line(margin + 22, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.diagnosis) {
      pdf.text(data.diagnosis, margin + 24, yPosition);
    }
    yPosition += 12;

    // Operation
    pdf.text("Operation", margin, yPosition);
    pdf.line(margin + 20, yPosition + 1, pageWidth - margin, yPosition + 1);
    if (data.operation) {
      yPosition = addText(data.operation, margin + 22, yPosition, pageWidth - margin - 22);
    } else {
      yPosition += lineHeight;
    }
    yPosition += 5;

    // Hospital Treatment Section
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(139, 69, 19); // Brown color
    pdf.text("HOSPITAL TREATMENT", margin, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    // Add hospital treatment content if provided
    if (data.hospitalTreatment) {
      yPosition = addText(data.hospitalTreatment, margin, yPosition, pageWidth - margin * 2);
    }
    yPosition += 15;

    // Home Treatment Section
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(139, 69, 19); // Brown color
    pdf.text("HOME TREATMENT", margin, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    // Add home treatment content if provided
    if (data.homeTreatment) {
      yPosition = addText(data.homeTreatment, margin, yPosition, pageWidth - margin * 2);
    }
    yPosition += 20;

    // Doctor's Sign - positioned at bottom right for manual signing
    const signatureText = "Doctor's Sign";
    const signatureWidth = pdf.getTextWidth(signatureText);
    const signatureX = pageWidth - margin - signatureWidth - 30; // Leave space for signature line
    
    pdf.text(signatureText, signatureX, yPosition);
    pdf.line(signatureX + signatureWidth + 5, yPosition + 1, pageWidth - margin, yPosition + 1);

    // Open PDF in new tab
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};