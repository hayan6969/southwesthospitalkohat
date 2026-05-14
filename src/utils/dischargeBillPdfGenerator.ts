import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: hs } = await supabase.from("hospital_settings").select("hospital_name,contact_number,logo_url").maybeSingle();

  const pdf = new jsPDF("p", "mm", "a4");
  const pw = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  pdf.setFontSize(15); pdf.setFont("helvetica", "bold");
  pdf.text(hs?.hospital_name || "Hospital", pw / 2, y, { align: "center" }); y += 6;
  pdf.setFontSize(11); pdf.setFont("helvetica", "normal");
  pdf.text("IPD DISCHARGE BILL", pw / 2, y, { align: "center" }); y += 5;
  if (hs?.contact_number) { pdf.setFontSize(9); pdf.text(`Phone: ${hs.contact_number}`, pw / 2, y, { align: "center" }); y += 5; }

  pdf.setLineWidth(0.3); pdf.line(margin, y, pw - margin, y); y += 5;

  pdf.setFontSize(9);
  const col2 = pw / 2 + 5;
  const row = (l1: string, v1: string, l2?: string, v2?: string) => {
    pdf.setFont("helvetica", "bold"); pdf.text(l1, margin, y);
    pdf.setFont("helvetica", "normal"); pdf.text(v1, margin + 35, y);
    if (l2) { pdf.setFont("helvetica", "bold"); pdf.text(l2, col2, y); pdf.setFont("helvetica", "normal"); pdf.text(v2 || "", col2 + 35, y); }
    y += 5;
  };
  row("Invoice #:", d.invoiceNumber, "Admission #:", d.admissionNumber);
  row("Patient:", d.patientName, "Ward / Bed:", `${d.wardName || "-"} / ${d.bedNumber || "-"}`);
  row("Admitted:", new Date(d.admissionDate).toLocaleString(), "Discharged:", new Date(d.dischargeDate).toLocaleString());
  row("Stay (days):", String(d.days));

  y += 3;
  pdf.setFillColor(40, 40, 40); pdf.rect(margin, y, pw - margin * 2, 7, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("Description", margin + 2, y + 5);
  pdf.text("Qty", pw - margin - 60, y + 5, { align: "right" });
  pdf.text("Unit", pw - margin - 30, y + 5, { align: "right" });
  pdf.text("Amount", pw - margin - 2, y + 5, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  y += 9;

  pdf.setFont("helvetica", "normal");
  d.items.forEach((it) => {
    if (y > 260) { pdf.addPage(); y = margin; }
    const desc = pdf.splitTextToSize(it.description, pw - margin * 2 - 70);
    pdf.text(desc, margin + 2, y);
    pdf.text(String(it.qty), pw - margin - 60, y, { align: "right" });
    pdf.text(fmt(it.unit), pw - margin - 30, y, { align: "right" });
    pdf.text(fmt(it.amount), pw - margin - 2, y, { align: "right" });
    y += Math.max(5, desc.length * 4);
  });

  y += 3; pdf.line(margin, y, pw - margin, y); y += 5;
  const totalRow = (l: string, v: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(l, pw - margin - 60, y, { align: "right" });
    pdf.text(v, pw - margin - 2, y, { align: "right" });
    y += 5;
  };
  totalRow("Subtotal:", fmt(d.subtotal));
  totalRow("Discount:", `- ${fmt(d.discount)}`);
  totalRow("Total Due:", fmt(d.total), true);
  totalRow("Paid:", fmt(d.paid));
  totalRow("Balance:", fmt(Math.max(0, d.total - d.paid)), true);

  y += 15;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.line(pw - margin - 60, y, pw - margin, y);
  pdf.text("Authorized Signature", pw - margin - 30, y + 5, { align: "center" });

  const blob = pdf.output("blob");
  window.open(URL.createObjectURL(blob), "_blank");
}
