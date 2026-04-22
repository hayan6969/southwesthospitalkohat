import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface FinancialMetrics {
  pharmacySales: number;
  pharmacyProfit: number;
  pharmacyReturns: number;
  hospitalRevenue: number;
  hospitalProfitWithoutPharmacy: number;
  hospitalProfitWithPharmacy: number;
  operationsRevenue: number;
  labRevenue: number;
  xrayRevenue: number;
  emergencyRevenue: number;
  doctorsRevenue: number;
  totalExpenses: number;
  pharmacyInvoicesCount: number;
  pharmacyInvoicesAmount: number;
  pharmacyExpensesCount: number;
  pharmacyExpensesAmount: number;
  totalInvoicesCount: number;
  totalInvoicesAmount: number;
  totalRefunds: number;
  doctorPaymentsPaidCount: number;
  doctorPaymentsPaidAmount: number;
  recentActivity: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string;
  }>;
}

const getRefundTypeLabel = (type: string): string => {
  switch (type) {
    case 'appointment':
      return 'Appointment Refund';
    case 'pharmacy_invoice':
      return 'Pharmacy Refund';
    case 'ot_schedule':
      return 'OT Refund';
    case 'lab_report':
      return 'Lab Refund';
    default:
      return 'Other Refund';
  }
};

export type FilterMode = 'all-time' | 'monthly' | 'custom';

interface FilterParams {
  mode: FilterMode;
  selectedMonth?: Date;
  startDate?: Date;
  endDate?: Date;
}

export const useFinancialAnalytics = (selectedMonth?: Date, filterParams?: FilterParams) => {
  const mode = filterParams?.mode || 'monthly';
  const customStart = filterParams?.startDate;
  const customEnd = filterParams?.endDate;

  return useQuery<FinancialMetrics>({
    queryKey: ['financial-analytics', mode, selectedMonth?.toISOString(), customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async () => {
      // Determine date range based on mode
      let monthStartDate: string;
      let monthEndDate: string;
      let monthStartISO: string;
      let monthEndISO: string;
      let payPeriodFormat: string | null = null;

      if (mode === 'all-time') {
        monthStartDate = '2000-01-01';
        monthEndDate = new Date().toISOString().split('T')[0];
        monthStartISO = new Date('2000-01-01').toISOString();
        monthEndISO = new Date().toISOString();
      } else if (mode === 'custom' && customStart && customEnd) {
        monthStartDate = customStart.toISOString().split('T')[0];
        monthEndDate = customEnd.toISOString().split('T')[0];
        monthStartISO = customStart.toISOString();
        monthEndISO = customEnd.toISOString();
      } else {
        const targetDate = selectedMonth || new Date();
        const monthStart = startOfMonth(targetDate);
        const monthEnd = endOfMonth(targetDate);
        monthStartDate = monthStart.toISOString().split('T')[0];
        monthEndDate = monthEnd.toISOString().split('T')[0];
        monthStartISO = monthStart.toISOString();
        monthEndISO = monthEnd.toISOString();
        payPeriodFormat = format(targetDate, 'MMMM yyyy');
      }

      // Batch all independent queries with Promise.all
      const results = await Promise.all([
        supabase.from('daily_closings').select('*').gte('closing_date', monthStartDate).lte('closing_date', monthEndDate).order('closing_date', { ascending: true }),
        supabase.from('pharmacy_invoices').select('*', { count: 'exact', head: true }).gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'completed'),
        supabase.from('pharmacy_invoices').select('final_amount, pharmacy_invoice_items(quantity, medicines(purchase_price, selling_price))').gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'completed'),
        supabase.from('pharmacy_expenses').select('*', { count: 'exact', head: true }).gte('expense_date', monthStartDate).lte('expense_date', monthEndDate),
        supabase.from('pharmacy_expenses').select('amount').gte('expense_date', monthStartDate).lte('expense_date', monthEndDate),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'paid'),
        supabase.from('invoices').select('id, amount, description, invoice_number, emergency_patient_data, created_at').gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'paid'),
        supabase.from('refunds').select('amount').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('doctor_payments').select('*', { count: 'exact', head: true }).gte('period_start', monthStartDate).lte('period_end', monthEndDate),
        supabase.from('doctor_payments').select('total_earnings').gte('period_start', monthStartDate).lte('period_end', monthEndDate),
        supabase.from('lab_reports').select('price').not('price', 'is', null).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('xray_reports').select('price').not('price', 'is', null).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('ot_schedules').select('total_cost, doctor_expense').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('miscellaneous_income').select('amount').gte('income_date', monthStartDate).lte('income_date', monthEndDate),
        supabase.from('appointments').select('consultation_fee_at_time').eq('type', 'emergency').eq('status', 'completed').gte('appointment_date', monthStartISO).lte('appointment_date', monthEndISO),
        supabase.from('expenses').select('amount').gte('expense_date', monthStartDate).lte('expense_date', monthEndDate),
      ]);

      const [closingsRes, pharmacyInvoicesCountRes, pharmacyInvoicesRes, pharmacyExpensesCountRes, pharmacyExpensesRes, hospitalInvoicesCountRes, hospitalInvoicesRes, refundsRes, doctorPaymentsCountRes, doctorPaymentsRes, labReportsRes, xrayReportsRes, otSchedulesRes, miscIncomeRes, emergencyApptsRes, expensesRes] = results;

      const dailyClosings = closingsRes.data;
      if (closingsRes.error) throw closingsRes.error;

      const pharmacyInvoicesCount = pharmacyInvoicesCountRes.count;
      const pharmacyInvoices = pharmacyInvoicesRes.data;
      const pharmacyExpensesCount = pharmacyExpensesCountRes.count;
      const pharmacyExpenses = pharmacyExpensesRes.data;
      const hospitalInvoicesCount = hospitalInvoicesCountRes.count;
      const hospitalInvoices = hospitalInvoicesRes.data;
      const refunds = refundsRes.data;
      const doctorPaymentsCount = doctorPaymentsCountRes.count;
      const doctorPayments = doctorPaymentsRes.data;

      // For monthly mode, use pay_period; for other modes, use date range
      let payrollsCount = 0;
      let payrollsData: any[] = [];
      if (payPeriodFormat) {
        const { count } = await supabase
          .from('payroll')
          .select('*', { count: 'exact', head: true })
          .eq('pay_period', payPeriodFormat)
          .eq('status', 'paid');
        payrollsCount = count || 0;
        const { data } = await supabase
          .from('payroll')
          .select('net_salary')
          .eq('pay_period', payPeriodFormat)
          .eq('status', 'paid');
        payrollsData = data || [];
      }


      // Helper function to recalculate hospital services revenue from transactions_data
      const computeServicesRevenue = (td?: any): number => {
        if (!td) return 0;
        const lab = (td.labReports || []).reduce((s: number, r: any) => s + (Number(r.price) || Number(r.amount) || 0), 0);
        const xray = (td.xrayReports || []).reduce((s: number, r: any) => s + (Number(r.price) || Number(r.amount) || 0), 0);
        const ot = (td.otSchedules || []).reduce((s: number, ot: any) => 
          s + ((Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0)), 0);
        const emergencyAppointments = (td.emergencyAppointments || []).reduce((s: number, e: any) => 
          s + (Number(e.consultation_fee_at_time) || 0), 0);
        const emergencyInvoices = (td.hospitalInvoices || []).filter((inv: any) =>
          inv?.description?.toLowerCase?.().includes('emergency') ||
          inv?.emergency_patient_data ||
          inv?.invoice_number?.startsWith?.('EMG-') ||
          inv?.invoice_number?.startsWith?.('EMERGENCY-')
        );
        const emergencyInvoiceRevenue = emergencyInvoices.reduce((s: number, inv: any) => 
          s + (Number(inv.amount) || 0), 0);
        const emergency = emergencyAppointments + emergencyInvoiceRevenue;
        const misc = (td.miscellaneousIncome || []).reduce((s: number, m: any) => 
          s + (Number(m.amount) || 0), 0);
        return lab + xray + ot + emergency + misc;
      };

      // ===== Compute hospital revenue directly from raw transaction tables =====
      const labReportsArr = labReportsRes.data || [];
      const xrayReportsArr = xrayReportsRes.data || [];
      const otSchedulesArr = otSchedulesRes.data || [];
      const miscIncomeArr = miscIncomeRes.data || [];
      const emergencyApptsArr = emergencyApptsRes.data || [];
      const expensesArr = expensesRes.data || [];
      const hospitalInvoicesArr = hospitalInvoicesRes.data || [];
      const pharmacyInvoicesArr = pharmacyInvoicesRes.data || [];

      const isEmergencyInv = (inv: any) =>
        inv?.description?.toLowerCase?.().includes('emergency') ||
        inv?.emergency_patient_data ||
        inv?.invoice_number?.startsWith?.('EMG-') ||
        inv?.invoice_number?.startsWith?.('EMERGENCY-');

      const totalLabRevenue = labReportsArr.reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
      const totalXrayRevenue = xrayReportsArr.reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
      const totalOperationsRevenue = otSchedulesArr.reduce((s: number, ot: any) =>
        s + ((Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0)), 0);
      const otDoctorExpense = otSchedulesArr.reduce((s: number, ot: any) => s + (Number(ot.doctor_expense) || 0), 0);
      const miscRevenue = miscIncomeArr.reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0);
      const emergencyApptRevenue = emergencyApptsArr.reduce((s: number, e: any) => s + (Number(e.consultation_fee_at_time) || 0), 0);
      const emergencyInvoiceRevenue = hospitalInvoicesArr.filter(isEmergencyInv)
        .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
      const totalEmergencyRevenue = emergencyApptRevenue + emergencyInvoiceRevenue;
      const opdConsultationRevenue = hospitalInvoicesArr
        .filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv))
        .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);

      const totalHospitalRevenue = totalLabRevenue + totalXrayRevenue + totalOperationsRevenue + totalEmergencyRevenue + miscRevenue;
      const totalDoctorsRevenue = opdConsultationRevenue + otDoctorExpense;
      const totalExpenses = expensesArr.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      // Pharmacy: sales and profit from raw invoices
      const positivePharm = pharmacyInvoicesArr.filter((inv: any) => Number(inv.final_amount || 0) >= 0);
      const negativePharm = pharmacyInvoicesArr.filter((inv: any) => Number(inv.final_amount || 0) < 0);
      const grossPharmSales = positivePharm.reduce((s: number, inv: any) => s + Number(inv.final_amount || 0), 0);
      const totalPharmacyReturns = Math.abs(negativePharm.reduce((s: number, inv: any) => s + Number(inv.final_amount || 0), 0));
      const totalPharmacySales = grossPharmSales - totalPharmacyReturns;
      const totalPharmacyProfit = positivePharm.reduce((total: number, inv: any) => {
        return total + ((inv.pharmacy_invoice_items || []).reduce((p: number, item: any) => {
          if (item.medicines?.selling_price && item.medicines?.purchase_price) {
            return p + ((Number(item.medicines.selling_price) - Number(item.medicines.purchase_price)) * Number(item.quantity || 0));
          }
          return p;
        }, 0));
      }, 0);

      const hospitalProfitWithoutPharmacy = totalHospitalRevenue - totalExpenses;
      const hospitalProfitWithPharmacy = hospitalProfitWithoutPharmacy + totalPharmacyProfit;

      const finalPharmacyInvoicesCount = pharmacyInvoicesCount || 0;
      const finalPharmacyInvoicesAmount = pharmacyInvoicesArr.reduce((sum, inv: any) => sum + (Number(inv.final_amount) || 0), 0);
      const finalPharmacyExpensesCount = pharmacyExpensesCount || 0;
      const finalPharmacyExpensesAmount = pharmacyExpenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
      const totalInvoicesCount = hospitalInvoicesCount || 0;
      const totalInvoicesAmount = hospitalInvoicesArr.reduce((sum, inv: any) => sum + (Number(inv.amount) || 0), 0);
      const totalRefunds = refunds?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const doctorPaymentsPaidCount = doctorPaymentsCount || 0;
      const doctorPaymentsPaidAmount = doctorPayments?.reduce((sum, dp) => sum + (Number(dp.total_earnings) || 0), 0) || 0;

      // Recent activity: prefer daily closings if any, otherwise show recent paid invoices
      const recentActivity = (dailyClosings && dailyClosings.length > 0)
        ? dailyClosings.slice(-10).reverse().map(closing => ({
            id: closing.id,
            type: 'Daily Closing',
            amount: (computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue) + (closing.pharmacy_profit || 0),
            date: closing.closing_time,
            description: `${closing.day_name} - ${new Date(closing.closing_date).toLocaleDateString()}`,
          }))
        : hospitalInvoicesArr
            .slice()
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
            .map((inv: any) => ({
              id: inv.id,
              type: 'Invoice',
              amount: Number(inv.amount) || 0,
              date: inv.created_at,
              description: inv.invoice_number || inv.description || 'Invoice',
            }));

      return {
        pharmacySales: totalPharmacySales,
        pharmacyProfit: totalPharmacyProfit,
        pharmacyReturns: totalPharmacyReturns,
        hospitalRevenue: totalHospitalRevenue,
        hospitalProfitWithoutPharmacy,
        hospitalProfitWithPharmacy,
        operationsRevenue: totalOperationsRevenue,
        labRevenue: totalLabRevenue,
        xrayRevenue: totalXrayRevenue,
        emergencyRevenue: totalEmergencyRevenue,
        doctorsRevenue: totalDoctorsRevenue,
        totalExpenses,
        pharmacyInvoicesCount: finalPharmacyInvoicesCount,
        pharmacyInvoicesAmount: finalPharmacyInvoicesAmount,
        pharmacyExpensesCount: finalPharmacyExpensesCount,
        pharmacyExpensesAmount: finalPharmacyExpensesAmount,
        totalInvoicesCount,
        totalInvoicesAmount,
        totalRefunds,
        doctorPaymentsPaidCount,
        doctorPaymentsPaidAmount,
        recentActivity,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
