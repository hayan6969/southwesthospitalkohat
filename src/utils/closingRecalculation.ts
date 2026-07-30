import { supabase } from "@/integrations/supabase/client";

/**
 * Recomputes the totals + transaction snapshot for a daily closing window.
 * Mirrors the math used when a new daily closing is created in FinanceDaily.
 *
 * @param cutoffTime  exclusive lower bound (previous closing time, ISO string)
 * @param upperBound  inclusive upper bound (this closing time, ISO string)
 */
export async function computeClosingTotals(cutoffTime: string, upperBound: string) {
  const [
    hospitalInvoicesRes,
    pharmacyInvoicesRes,
    labInvoicesRes,
    xrayReportsRes,
    otSchedulesRes,
    emergencyAppointmentsRes,
    expensesRes,
    refundsRes,
    pharmacyExpensesRes,
    pharmacyAccountRes,
    totalStockRes,
    miscellaneousIncomeRes,
    ipdRes,
  ] = await Promise.all([
    supabase.from('invoices')
      .select('*, patients(id, profiles!patients_id_fkey(first_name, last_name))')
      .eq('status', 'paid')
      .gt('created_at', cutoffTime)
      .lte('created_at', upperBound),

    supabase.from('pharmacy_invoices')
      .select(`*, pharmacy_invoice_items(quantity, unit_price, total_price, medicine_id, medicines(name, purchase_price, selling_price))`)
      .gt('created_at', cutoffTime)
      .lte('created_at', upperBound),

    supabase.from('invoices')
      .select('*, patients(id, profiles!patients_id_fkey(first_name, last_name))')
      .eq('status', 'paid')
      .or('invoice_number.like.LAB-%,invoice_number.like.PATH-INV-%')
      .gt('created_at', cutoffTime)
      .lte('created_at', upperBound),

    // xray_reports / ot_schedules / appointments have no FK to patients in the
    // schema cache, so patient names are resolved separately below.
    supabase.from('xray_reports')
      .select('*')
      .not('price', 'is', null)
      .gt('created_at', cutoffTime)
      .lte('created_at', upperBound),

    supabase.from('ot_schedules')
      .select('*')
      .in('status', ['completed', 'pending'])
      .gt('created_at', cutoffTime)
      .lte('created_at', upperBound),

    supabase.from('appointments')
      .select('*')
      .ilike('type', 'emergency')
      .eq('status', 'completed')
      .gt('appointment_date', cutoffTime)
      .lte('appointment_date', upperBound),


    supabase.from('expenses').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound),
    supabase.from('refunds').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound),
    supabase.from('pharmacy_expenses').select('*').gt('expense_date', cutoffTime).lte('expense_date', upperBound),
    supabase.from('pharmacy_account').select('*').order('created_at', { ascending: false }).limit(1),
    supabase.from('medicines').select('stock_quantity, purchase_price'),
    supabase.from('miscellaneous_income').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound),
    supabase.from('ipd_invoices').select('*').not('finalized_at', 'is', null).gt('created_at', cutoffTime).lte('created_at', upperBound),
  ]);

  const firstError = [
    hospitalInvoicesRes.error, pharmacyInvoicesRes.error, labInvoicesRes.error,
    xrayReportsRes.error, otSchedulesRes.error, emergencyAppointmentsRes.error,
    expensesRes.error, refundsRes.error, miscellaneousIncomeRes.error, ipdRes.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const hospitalInvoices = hospitalInvoicesRes.data || [];
  const pharmacyInvoices = pharmacyInvoicesRes.data || [];
  const labInvoices = labInvoicesRes.data || [];
  const xrayReports = xrayReportsRes.data || [];
  const otSchedules = otSchedulesRes.data || [];
  const emergencyAppointments = emergencyAppointmentsRes.data || [];
  const expenses = expensesRes.data || [];
  const refunds = refundsRes.data || [];
  const pharmacyExpenses = pharmacyExpensesRes.data || [];
  const pharmacyAccount = pharmacyAccountRes.data?.[0] || null;
  const totalStock = totalStockRes.data || [];
  const miscellaneousIncome = miscellaneousIncomeRes.data || [];
  const ipdInvoices = ipdRes.data || [];

  // Hydrate patient names for the tables without a schema-cache relationship.
  const patientIds = Array.from(new Set(
    [...xrayReports, ...otSchedules, ...emergencyAppointments]
      .map((row: any) => row.patient_id)
      .filter(Boolean)
  ));
  if (patientIds.length) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', patientIds);
    const nameMap = new Map((profileRows || []).map((p: any) => [p.id, p]));
    const attach = (row: any) => {
      const p = nameMap.get(row.patient_id);
      if (p) row.patients = { profiles: { first_name: p.first_name, last_name: p.last_name } };
      return row;
    };
    xrayReports.forEach(attach);
    otSchedules.forEach(attach);
    emergencyAppointments.forEach(attach);
  }



  const isEmergencyInvoice = (invoice: any) =>
    invoice.description?.toLowerCase().includes('emergency') || Boolean(invoice.emergency_patient_data);

  const emergencyAppointmentRevenue = emergencyAppointments.reduce(
    (sum: number, apt: any) => sum + (apt.consultation_fee_at_time || 0), 0);
  const emergencyInvoiceRevenue = hospitalInvoices
    .filter(isEmergencyInvoice)
    .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
  const emergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;

  const positiveInvoices = pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) >= 0);
  const negativeInvoices = pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) < 0);

  const pharmacyReturns = Math.abs(negativeInvoices.reduce((s: number, inv: any) => s + (inv.final_amount || 0), 0));
  const grossPharmacyRevenue = positiveInvoices.reduce((s: number, inv: any) => s + (inv.final_amount || 0), 0);
  const pharmacyRevenue = grossPharmacyRevenue - pharmacyReturns;

  const profitOf = (list: any[]) => list.reduce((total: number, invoice: any) => {
    const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((acc: number, item: any) => {
      if (item.medicines && item.medicines.purchase_price) {
        return acc + ((item.unit_price - item.medicines.purchase_price) * Math.abs(item.quantity));
      }
      return acc;
    }, 0);
    return total + invoiceProfit;
  }, 0);
  const pharmacyProfit = profitOf(positiveInvoices) - profitOf(negativeInvoices);

  const labRevenue = labInvoices.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const xrayRevenue = hospitalInvoices
    .filter((inv: any) => /^XR-/i.test(inv.invoice_number || ''))
    .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const otHospitalRevenue = otSchedules.reduce(
    (s: number, ot: any) => s + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0);
  const miscIncome = miscellaneousIncome.reduce((s: number, income: any) => s + (income.amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, exp: any) => s + (exp.amount || 0), 0);
  const totalRefunds = refunds
    .filter((r: any) => r.refund_type !== 'discount_adjustment')
    .reduce((s: number, ref: any) => s + (ref.amount || 0), 0);

  const totalHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscIncome;
  const totalStockValue = totalStock.reduce(
    (s: number, m: any) => s + ((m.stock_quantity || 0) * (m.purchase_price || 0)), 0);

  return {
    hospitalRevenue: totalHospitalRevenue,
    pharmacyRevenue,
    pharmacyProfit,
    totalExpenses,
    totalRefunds,
    netProfit: totalHospitalRevenue - totalExpenses - totalRefunds,
    transactionsData: {
      hospitalInvoices,
      pharmacyInvoices,
      labReports: labInvoices.map((inv: any) => ({ ...inv, price: inv.amount })),
      xrayReports,
      otSchedules,
      emergencyAppointments,
      expenses,
      refunds,
      pharmacyExpenses,
      miscellaneousIncome,
      pharmacyAccount,
      totalStockValue,
      ipdInvoices,
      cutoffTime,
      closingTimestamp: upperBound,
    },
  };
}
