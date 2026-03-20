import { supabase } from '@/integrations/supabase/client';
import { generateDailyClosingPDF } from './pdfGenerator';
import { format } from 'date-fns';

/**
 * Queries all transaction data for a date range and generates a detailed PDF report
 * using the same format as the daily closing detailed report.
 */
export const generateAnalyticsReportPDF = async (startDate: Date, endDate: Date) => {
  const startISO = startDate.toISOString();
  // Set end to end of day
  const endCopy = new Date(endDate);
  endCopy.setHours(23, 59, 59, 999);
  const endISO = endCopy.toISOString();
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Query all transaction types for the date range
  const [
    hospitalInvoicesRes,
    pharmacyInvoicesRes,
    labReportsRes,
    xrayReportsRes,
    otSchedulesRes,
    emergencyAppointmentsRes,
    expensesRes,
    refundsRes,
    miscellaneousIncomeRes,
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, patients(id, profiles(first_name, last_name)), emergency_patient_data')
      .eq('status', 'paid')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('pharmacy_invoices')
      .select(`*, pharmacy_invoice_items(quantity, unit_price, total_price, medicine_id, medicines(name, purchase_price, selling_price))`)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('lab_reports')
      .select('*, patients(id, profiles(first_name, last_name))')
      .not('price', 'is', null)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('xray_reports')
      .select('*, xray_patient:patient_id(first_name, last_name), xray_tests(name)')
      .not('price', 'is', null)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('ot_schedules')
      .select('*, patients(id, profiles(first_name, last_name)), ot_operations(operation_name)')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('appointments')
      .select('*, patients(id, profiles(first_name, last_name))')
      .eq('type', 'emergency')
      .eq('status', 'completed')
      .gte('appointment_date', startISO)
      .lte('appointment_date', endISO),
    supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDateStr)
      .lte('expense_date', endDateStr),
    supabase
      .from('refunds')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('miscellaneous_income')
      .select('*')
      .gte('income_date', startDateStr)
      .lte('income_date', endDateStr),
  ]);

  const labReports = labReportsRes.data || [];

  // Enrich lab reports with invoice amounts (for discount visibility)
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

  // Deduplicate hospital invoices (same patient, amount, within 2 min)
  const rawHospitalInvoices = hospitalInvoicesRes.data || [];
  const dedupWindowMs = 2 * 60 * 1000;
  const dedupedHospitalInvoices: any[] = [];
  for (const inv of rawHospitalInvoices) {
    const amt = Number(inv.amount ?? 0);
    const ts = inv.created_at ? new Date(inv.created_at).getTime() : 0;
    const isDup = dedupedHospitalInvoices.some(
      (e: any) =>
        e.patient_id === inv.patient_id &&
        Number(e.amount ?? 0) === amt &&
        Math.abs((e.created_at ? new Date(e.created_at).getTime() : 0) - ts) <= dedupWindowMs
    );
    if (!isDup) dedupedHospitalInvoices.push(inv);
  }

  const transactionsData = {
    hospitalInvoices: dedupedHospitalInvoices,
    pharmacyInvoices: pharmacyInvoicesRes.data || [],
    labReports: enrichedLabReports,
    xrayReports: xrayReportsRes.data || [],
    otSchedules: otSchedulesRes.data || [],
    emergencyAppointments: emergencyAppointmentsRes.data || [],
    expenses: expensesRes.data || [],
    refunds: refundsRes.data || [],
    miscellaneousIncome: miscellaneousIncomeRes.data || [],
  };

  // Calculate totals
  const hospitalInvoices = transactionsData.hospitalInvoices;
  const labRev = enrichedLabReports.reduce((s: number, r: any) => s + (r.invoice_amount != null ? Number(r.invoice_amount) : (Number(r.price) || 0)), 0);
  const xrayRev = (transactionsData.xrayReports).reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
  const otHosShare = (transactionsData.otSchedules).reduce((s: number, ot: any) =>
    s + ((Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0)), 0);

  const isEmergencyInv = (inv: any) =>
    inv.description?.toLowerCase().includes('emergency') ||
    inv.emergency_patient_data ||
    inv.invoice_number?.startsWith('EMG-') ||
    inv.invoice_number?.startsWith('EMERGENCY-');

  const emergencyRev = hospitalInvoices.filter(isEmergencyInv)
    .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const emergencyAptRev = (transactionsData.emergencyAppointments)
    .reduce((s: number, e: any) => s + (Number(e.consultation_fee_at_time) || 0), 0);
  const miscRev = (transactionsData.miscellaneousIncome)
    .reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);

  const hospitalRevenue = labRev + xrayRev + otHosShare + emergencyRev + emergencyAptRev + miscRev;

  const pharmacyPositive = (transactionsData.pharmacyInvoices)
    .filter((inv: any) => (inv.final_amount || 0) >= 0)
    .reduce((s: number, inv: any) => s + (Number(inv.final_amount) || 0), 0);
  const pharmacyNeg = Math.abs((transactionsData.pharmacyInvoices)
    .filter((inv: any) => (inv.final_amount || 0) < 0)
    .reduce((s: number, inv: any) => s + (Number(inv.final_amount) || 0), 0));
  const pharmacyRevenue = pharmacyPositive - pharmacyNeg;

  const pharmacyProfit = (transactionsData.pharmacyInvoices)
    .filter((inv: any) => (inv.final_amount || 0) >= 0)
    .reduce((totalProfit: number, invoice: any) => {
      return totalProfit + ((invoice as any).pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
        if (item.medicines?.selling_price && item.medicines?.purchase_price) {
          return itemsProfit + ((item.medicines.selling_price - item.medicines.purchase_price) * item.quantity);
        }
        return itemsProfit;
      }, 0);
    }, 0);

  const totalExpenses = (transactionsData.expenses).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const totalRefunds = (transactionsData.refunds).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  const netProfit = hospitalRevenue - totalExpenses - totalRefunds + pharmacyProfit;

  const dateLabel = startDateStr === endDateStr
    ? format(startDate, 'dd MMM yyyy')
    : `${format(startDate, 'dd MMM yyyy')} to ${format(endDate, 'dd MMM yyyy')}`;

  const dayName = startDateStr === endDateStr
    ? format(startDate, 'EEEE')
    : `${format(startDate, 'EEE')} - ${format(endDate, 'EEE')}`;

  // Reuse the existing detailed PDF generator
  await generateDailyClosingPDF({
    closingDate: startDateStr,
    closingTime: endISO,
    dayName,
    hospitalRevenue,
    pharmacyRevenue,
    pharmacyProfit,
    totalExpenses,
    totalRefunds,
    netProfit,
    transactionsData,
    closingEndDate: endDateStr,
  });
};
