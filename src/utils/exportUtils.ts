import { formatPkrAmount } from "@/utils/currency";
import { format } from "date-fns";
import { formatInPakistanTime } from "@/utils/timezone";
import type { LabRegisterRow, LabRegisterSummary } from "@/utils/labRegisterPdfGenerator";

// Export staff revenue breakdown to CSV
export function exportRevenueToCSV(
  staffList: Array<{ name: string; role: string; count: number; total: number }>,
  untracked: { count: number; total: number },
  dateLabel: string
) {
  const rows: string[][] = [
    ["Staff Revenue Report", "", "", ""],
    ["Period", dateLabel, "", ""],
    ["Generated At", format(new Date(), "yyyy-MM-dd HH:mm:ss"), "", ""],
    [],
    ["Staff Name", "Role", "Invoices Generated", "Total Revenue (PKR)"],
  ];

  let grandTotal = 0;
  for (const s of staffList) {
    rows.push([s.name, s.role, String(s.count), String(s.total)]);
    grandTotal += s.total;
  }

  if (untracked.count > 0) {
    rows.push(["Untracked (legacy)", "N/A", String(untracked.count), String(untracked.total)]);
    grandTotal += untracked.total;
  }

  rows.push([]);
  rows.push(["Grand Total", "", "", String(grandTotal)]);

  const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  downloadCSV(csvContent, `staff-revenue-${dateLabel}.csv`);
}

// Export daily closing data to CSV
export function exportDailyClosingToCSV(data: {
  date: string;
  hospitalRevenue: number;
  doctorRevenue: number;
  consultationRevenue: number;
  otDoctorExpense: number;
  emergencyRevenue: number;
  labRevenue: number;
  xrayRevenue: number;
  otHospitalRevenue: number;
  miscellaneousIncome: number;
  pharmacyRevenue: number;
  pharmacyProfit: number;
  totalExpenses: number;
  totalRefunds: number;
  netProfit: number;
  ipdDoctorRevenue?: number;
  ipdAnesthesiaRevenue?: number;
  ipdOtaRevenue?: number;
  ipdOtRevenue?: number;
  ipdBedRevenue?: number;
  ipdMedicineRevenue?: number;
  ipdLabRevenue?: number;
  ipdTotalRevenue?: number;
  ipdTotalPaid?: number;
}) {
  const rows: string[][] = [
    ["Daily Financial Closing Report"],
    ["Date", data.date],
    ["Generated At", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [],
    ["Category", "Amount (PKR)"],
    [],
    ["=== HOSPITAL REVENUE ===", ""],
    ["Emergency Revenue", String(data.emergencyRevenue)],
    ["Lab Revenue", String(data.labRevenue)],
    ["X-ray Revenue", String(data.xrayRevenue)],
    ["OT Revenue (Hospital)", String(data.otHospitalRevenue)],
    ["Miscellaneous Income", String(data.miscellaneousIncome)],
    ["Total Hospital Revenue", String(data.hospitalRevenue)],
    [],
    ["=== DOCTORS REVENUE ===", ""],
    ["Consultation Fees", String(data.consultationRevenue)],
    ["OT Doctor Fees", String(data.otDoctorExpense)],
    ["Total Doctor Revenue", String(data.doctorRevenue)],
    [],
    ["=== PHARMACY ===", ""],
    ["Pharmacy Revenue (Sales)", String(data.pharmacyRevenue)],
    ["Pharmacy Profit", String(data.pharmacyProfit)],
    [],
    data.ipdTotalRevenue ? [] as any : null,
    data.ipdTotalRevenue ? ["=== IPD REVENUE ===", ""] as any : null,
    data.ipdBedRevenue ? ["Bed / Stay Charges", String(data.ipdBedRevenue)] as any : null,
    data.ipdDoctorRevenue ? ["IPD Doctor Fees", String(data.ipdDoctorRevenue)] as any : null,
    data.ipdAnesthesiaRevenue ? ["IPD Anesthesia", String(data.ipdAnesthesiaRevenue)] as any : null,
    data.ipdOtaRevenue ? ["IPD OTA Charges", String(data.ipdOtaRevenue)] as any : null,
    data.ipdOtRevenue ? ["IPD OT Charges", String(data.ipdOtRevenue)] as any : null,
    data.ipdMedicineRevenue ? ["IPD Medicines", String(data.ipdMedicineRevenue)] as any : null,
    data.ipdLabRevenue ? ["IPD Lab Tests", String(data.ipdLabRevenue)] as any : null,
    data.ipdTotalRevenue ? ["Total IPD Revenue", String(data.ipdTotalRevenue)] as any : null,
    data.ipdTotalPaid ? ["IPD Total Collected", String(data.ipdTotalPaid)] as any : null,
    [],
    ["=== DEDUCTIONS ===", ""],
    ["Total Expenses", String(data.totalExpenses)],
    ["Total Refunds", String(data.totalRefunds)],
    [],
    ["=== SUMMARY ===", ""],
    ["Net Profit (Hospital)", String(data.netProfit)],
  ].filter(Boolean);

  const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  downloadCSV(csvContent, `daily-closing-${data.date}.csv`);
}

// Export the laboratory reports register (filtered rows + totals) to CSV
export function exportLabRegisterToCSV(
  rows: LabRegisterRow[],
  summary: LabRegisterSummary,
  periodLabel: string
) {
  const out: string[][] = [
    ["Laboratory Reports Register"],
    ["Period", periodLabel],
    ["Generated At", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Total Reports", String(summary.totalReports)],
    ["Total Charges (PKR)", String(summary.totalCharges)],
    ["Top Test", summary.topTest || "—"],
    [],
    ["S/N", "Date", "Report #", "Patient ID", "Patient Name", "Referred By", "Tests", "Charges (PKR)"],
  ];

  for (const r of rows) {
    out.push([
      String(r.serial),
      (() => { try { return formatInPakistanTime(r.date, "yyyy-MM-dd"); } catch { return ""; } })(),
      r.reportNumber || "",
      r.patientId || "",
      r.patientName || "",
      r.referredBy || "",
      r.tests.join(" | "),
      String(r.charges),
    ]);
  }

  out.push([]);
  out.push(["", "", "", "", "", "", "TOTAL", String(summary.totalCharges)]);

  const csvContent = out.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const safeLabel = periodLabel.replace(/[^\w-]+/g, "_").slice(0, 40);
  downloadCSV(csvContent, `lab-register-${safeLabel}.csv`);
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
