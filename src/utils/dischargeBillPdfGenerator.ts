import {
  THERMAL_WIDTH,
  THERMAL_MARGIN,
  THERMAL_CONTENT_WIDTH,
  THERMAL_CENTER,
  getHospitalSettings,
  createThermalDoc,
  drawThermalHeader,
  thermalDivider,
  thermalLine,
  openThermalPDF,
} from "./thermalReceipt";

interface BillItem { description: string; qty: number; unit: number; amount: number; }
interface BillData {
  invoiceNumber: string;
  admissionNumber: string;
  patientName: string;
  wardName?: string;
  bedNumber?: string;
  admissionDate: string;
  dischargeDate: string;
  days: number;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
}

const fmt = (n: number) => `Rs. ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function generateDischargeBillPDF(d: BillData) {
  const settings = await getHospitalSettings();

  // Estimate receipt height (mirrors pharmacy generator approach)
  const baseHeight = 150;
  const perItemHeight = 9;
  const pageHeight = baseHeight + d.items.length * perItemHeight;

  const pdf = createThermalDoc(pageHeight);
  let y = await drawThermalHeader(pdf, settings, "IPD DISCHARGE BILL");

  // Bill meta
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  y = thermalLine(pdf, `Invoice #: ${d.invoiceNumber}`, y);
  y = thermalLine(pdf, `Admission #: ${d.admissionNumber}`, y);
  y = thermalLine(pdf, `Patient: ${d.patientName}`, y);
  y = thermalLine(pdf, `Ward / Bed: ${d.wardName || "-"} / ${d.bedNumber || "-"}`, y);
  y = thermalLine(pdf, `Admitted: ${new Date(d.admissionDate).toLocaleString()}`, y);
  y = thermalLine(pdf, `Discharged: ${new Date(d.dischargeDate).toLocaleString()}`, y);
  y = thermalLine(pdf, `Stay (days): ${d.days}`, y);

  y = thermalDivider(pdf, y);

  // Items header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("Description", THERMAL_MARGIN, y);
  pdf.text("Amount", THERMAL_WIDTH - THERMAL_MARGIN, y, { align: "right" });
  y += 2;
  y = thermalDivider(pdf, y, 0.1);

  // Items
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  d.items.forEach((it) => {
    const nameLines = pdf.splitTextToSize(it.description, THERMAL_CONTENT_WIDTH - 18);
    pdf.text(nameLines[0], THERMAL_MARGIN, y);
    pdf.text(fmt(it.amount), THERMAL_WIDTH - THERMAL_MARGIN, y, { align: "right" });
    y += 3.5;
    for (let i = 1; i < nameLines.length; i++) {
      pdf.text(nameLines[i], THERMAL_MARGIN, y);
      y += 3.2;
    }
    if (it.qty > 1) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.5);
      pdf.text(`${it.qty} x ${fmt(it.unit)}`, THERMAL_MARGIN + 2, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      y += 3.2;
    }
    y += 1;
  });

  y = thermalDivider(pdf, y, 0.2);
  y += 1;

  // Totals
  const totalRow = (label: string, value: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 9 : 7.5);
    pdf.text(label, THERMAL_MARGIN, y);
    pdf.text(value, THERMAL_WIDTH - THERMAL_MARGIN, y, { align: "right" });
    y += bold ? 4.5 : 3.8;
  };
  totalRow("Subtotal:", fmt(d.subtotal));
  if (d.discount > 0) totalRow("Discount:", `- ${fmt(d.discount)}`);
  totalRow("Total Due:", fmt(d.total), true);
  totalRow("Paid:", fmt(d.paid));
  y = thermalDivider(pdf, y, 0.1);
  totalRow("Balance:", fmt(Math.max(0, d.total - d.paid)), true);

  y = thermalDivider(pdf, y, 0.2);

  // Footer
  y += 3;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.text("Thank you. Get well soon!", THERMAL_CENTER, y, { align: "center" });

  openThermalPDF(pdf);
}
