import { formatPkrAmount } from "@/utils/currency";
import { format } from "date-fns";

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
    ["=== DEDUCTIONS ===", ""],
    ["Total Expenses", String(data.totalExpenses)],
    ["Total Refunds", String(data.totalRefunds)],
    [],
    ["=== SUMMARY ===", ""],
    ["Net Profit (Hospital)", String(data.netProfit)],
  ];

  const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  downloadCSV(csvContent, `daily-closing-${data.date}.csv`);
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
