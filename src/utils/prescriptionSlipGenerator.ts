import jsPDF from 'jspdf';
import { formatInPakistanTime } from './timezone';

export interface PrescriptionSlipData {
  patientName: string;
  patientNumber: string;
  patientAge: string | number | null;
  doctorName: string;
  doctorId?: string | null;
  doctorSpecialization?: string | null;
  licenseNumber?: string | null;
  appointmentDate: string;
  consultationFee: number;
  bookingType?: string;
  tokenNumber?: string | null;
  template?: any;
}

const fmtPKR = (n: number) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

export const generatePrescriptionSlipPDF = async (data: PrescriptionSlipData): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let y = pageHeight / 3;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('PRESCRIPTION SLIP', pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const row = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 12, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '—', 50, y);
    y += 6;
  };

  row('Token:', data.tokenNumber || '—');
  row('Patient:', data.patientName);
  row('Patient ID:', data.patientNumber);
  row('Age:', String(data.patientAge ?? '—'));
  row('Doctor:', data.doctorName);
  if (data.doctorSpecialization) row('Specialization:', data.doctorSpecialization);
  if (data.licenseNumber) row('License #:', data.licenseNumber);

  let dateStr = data.appointmentDate;
  try { dateStr = formatInPakistanTime(data.appointmentDate, 'dd/MM/yyyy hh:mm a'); } catch { /* keep raw */ }
  row('Date:', dateStr);
  row('Booking:', data.bookingType || 'walk-in');
  row('Fee:', fmtPKR(Number(data.consultationFee) || 0));

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `prescription_${(data.patientName || 'patient').replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
