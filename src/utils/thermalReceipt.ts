import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

// Shared 80mm thermal-printer receipt helpers.
// Used by the Lab, X-ray, OT and IPD discharge invoice generators so they all
// produce consistent thermal receipts (same look as the pharmacy receipt).

// Size the page to the *printable* width of an 80mm roll (~72mm), so content
// never lands in the printer's unprintable edge margin and gets clipped.
export const THERMAL_WIDTH = 72; // mm (printable area of an 80mm thermal roll)
export const THERMAL_MARGIN = 4;
export const THERMAL_CONTENT_WIDTH = THERMAL_WIDTH - THERMAL_MARGIN * 2;
export const THERMAL_CENTER = THERMAL_WIDTH / 2;

export interface HospitalSettings {
  hospital_name: string;
  hospital_address?: string;
  contact_number?: string;
  logo_url?: string | null;
}

// Fetch hospital settings for receipt branding (with sensible fallback).
export const getHospitalSettings = async (): Promise<HospitalSettings> => {
  try {
    const { data, error } = await supabase
      .from('hospital_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as HospitalSettings;
  } catch (error) {
    console.error('Error fetching hospital settings:', error);
    return {
      hospital_name: 'Medical Center',
      hospital_address: 'Healthcare District',
      contact_number: '+92-XXX-XXXXXXX',
      logo_url: null,
    };
  }
};

// Create an 80mm-wide receipt document. Height is estimated by the caller;
// it is clamped to a sane minimum so very short receipts still render.
export const createThermalDoc = (estimatedHeight: number): jsPDF =>
  new jsPDF({ unit: 'mm', format: [THERMAL_WIDTH, Math.max(estimatedHeight, 60)] });

// Draw the hospital header (logo, name, address, phone) followed by a receipt
// title. Returns the new y cursor (mm) ready for the receipt body.
export const drawThermalHeader = async (
  pdf: jsPDF,
  settings: HospitalSettings,
  title: string,
  options: { nameSuffix?: string } = {}
): Promise<number> => {
  let y = 5;

  // Logo (small, centered)
  if (settings.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => {
          try {
            const logoSize = 14;
            pdf.addImage(img, 'JPEG', THERMAL_CENTER - logoSize / 2, y, logoSize, logoSize);
            resolve(true);
          } catch {
            resolve(false);
          }
        };
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
        img.src = settings.logo_url as string;
      });
      y += 16;
    } catch {
      // skip logo
    }
  }

  // Hospital name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const name = `${settings.hospital_name}${options.nameSuffix || ''}`;
  pdf.splitTextToSize(name, THERMAL_CONTENT_WIDTH).forEach((line: string) => {
    pdf.text(line, THERMAL_CENTER, y, { align: 'center' });
    y += 4.5;
  });

  // Address
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  if (settings.hospital_address) {
    pdf.splitTextToSize(settings.hospital_address, THERMAL_CONTENT_WIDTH).forEach((line: string) => {
      pdf.text(line, THERMAL_CENTER, y, { align: 'center' });
      y += 3.2;
    });
  }

  // Phone
  if (settings.contact_number) {
    pdf.text(`Tel: ${settings.contact_number}`, THERMAL_CENTER, y, { align: 'center' });
    y += 4;
  }

  // Divider
  y = thermalDivider(pdf, y, 0.2);

  // Receipt title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(title, THERMAL_CENTER, y, { align: 'center' });
  y += 4;

  return y;
};

// Draw a full-width horizontal divider; returns the y after it.
export const thermalDivider = (pdf: jsPDF, y: number, weight = 0.2): number => {
  pdf.setLineWidth(weight);
  pdf.line(THERMAL_MARGIN, y, THERMAL_WIDTH - THERMAL_MARGIN, y);
  return y + 3;
};

// Left-aligned label line within the margins (small body text).
export const thermalLine = (
  pdf: jsPDF,
  text: string,
  y: number,
  step = 3.5
): number => {
  const lines = pdf.splitTextToSize(text, THERMAL_CONTENT_WIDTH);
  lines.forEach((line: string) => {
    pdf.text(line, THERMAL_MARGIN, y);
    y += step;
  });
  return y;
};

// Output the finished receipt.
// - default: open in a new tab to review, then print manually.
// - { autoPrint: true }: send straight to the print dialog via a hidden iframe
//   (no visible tab), e.g. right after creating/confirming an order.
export const openThermalPDF = (pdf: jsPDF, opts: { autoPrint?: boolean } = {}): Blob => {
  if (opts.autoPrint) {
    // Embed a /Print OpenAction so the PDF viewer opens the print dialog itself.
    try { (pdf as unknown as { autoPrint: () => void }).autoPrint(); } catch { /* ignore */ }
  }
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  if (opts.autoPrint) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;';
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // OpenAction will still trigger the dialog
      }
    };
    document.body.appendChild(iframe);
  } else {
    window.open(url, '_blank');
  }
  return blob;
};
