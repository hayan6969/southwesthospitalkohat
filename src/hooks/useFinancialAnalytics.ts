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
      const [
        closingsRes,
        pharmacyInvoicesCountRes,
        pharmacyInvoicesRes,
        pharmacyExpensesCountRes,
        pharmacyExpensesRes,
        hospitalInvoicesCountRes,
        hospitalInvoicesRes,
        refundsRes,
        doctorPaymentsCountRes,
        doctorPaymentsRes,
        ...(payPeriodFormat ? [
        ] : [])
      ] = await Promise.all([
        supabase.from('daily_closings').select('*').gte('closing_date', monthStartDate).lte('closing_date', monthEndDate).order('closing_date', { ascending: true }),
        supabase.from('pharmacy_invoices').select('*', { count: 'exact', head: true }).gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'completed'),
        supabase.from('pharmacy_invoices').select('final_amount').gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'completed'),
        supabase.from('pharmacy_expenses').select('*', { count: 'exact', head: true }).gte('expense_date', monthStartDate).lte('expense_date', monthEndDate),
        supabase.from('pharmacy_expenses').select('amount').gte('expense_date', monthStartDate).lte('expense_date', monthEndDate),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'paid'),
        supabase.from('invoices').select('amount').gte('created_at', monthStartISO).lte('created_at', monthEndISO).eq('status', 'paid'),
        supabase.from('refunds').select('amount').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('doctor_payments').select('*', { count: 'exact', head: true }).gte('period_start', monthStartDate).lte('period_end', monthEndDate),
        supabase.from('doctor_payments').select('total_earnings').gte('period_start', monthStartDate).lte('period_end', monthEndDate),
      ]);

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

      const { count: hospitalInvoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'paid');

      const { data: hospitalInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'paid');

      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount')
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO);

      const { count: doctorPaymentsCount } = await supabase
        .from('doctor_payments')
        .select('*', { count: 'exact', head: true })
        .gte('period_start', monthStartDate)
        .lte('period_end', monthEndDate);

      const { data: doctorPayments } = await supabase
        .from('doctor_payments')
        .select('total_earnings')
        .gte('period_start', monthStartDate)
        .lte('period_end', monthEndDate);

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

      if (!dailyClosings || dailyClosings.length === 0) {
        return {
          pharmacySales: 0, pharmacyProfit: 0, pharmacyReturns: 0,
          hospitalRevenue: 0, hospitalProfitWithoutPharmacy: 0, hospitalProfitWithPharmacy: 0,
          operationsRevenue: 0, labRevenue: 0, xrayRevenue: 0,
          emergencyRevenue: 0, doctorsRevenue: 0, totalExpenses: 0,
          pharmacyInvoicesCount: 0, pharmacyInvoicesAmount: 0,
          pharmacyExpensesCount: 0, pharmacyExpensesAmount: 0,
          totalInvoicesCount: 0, totalInvoicesAmount: 0, totalRefunds: 0,
          doctorPaymentsPaidCount: 0, doctorPaymentsPaidAmount: 0,
          recentActivity: [],
        };
      }

      let totalPharmacySales = 0;
      let totalPharmacyProfit = 0;
      let totalPharmacyReturns = 0;
      let totalHospitalRevenue = 0;
      let totalExpenses = 0;
      let totalLabRevenue = 0;
      let totalXrayRevenue = 0;
      let totalOperationsRevenue = 0;
      let totalEmergencyRevenue = 0;
      let totalDoctorsRevenue = 0;

      dailyClosings.forEach(closing => {
        const hospitalRev = computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue;
        totalHospitalRevenue += hospitalRev;
        totalPharmacyProfit += Number(closing.pharmacy_profit || 0);
        totalExpenses += Number(closing.total_expenses || 0);
        
        const td = closing.transactions_data as any;
        if (td?.pharmacyInvoices) {
          const positiveInvoices = td.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) >= 0);
          const negativeInvoices = td.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) < 0);
          const grossSales = positiveInvoices.reduce((sum: number, inv: any) => 
            sum + Number(inv.final_amount || 0), 0);
          const returns = Math.abs(negativeInvoices.reduce((sum: number, inv: any) => 
            sum + Number(inv.final_amount || 0), 0));
          totalPharmacySales += (grossSales - returns);
          totalPharmacyReturns += returns;
        } else {
          totalPharmacySales += Number(closing.pharmacy_revenue || 0);
        }
        
        if (td) {
          totalLabRevenue += (td.labReports || []).reduce((s: number, r: any) => 
            s + (Number(r.price) || Number(r.amount) || 0), 0);
          totalXrayRevenue += (td.xrayReports || []).reduce((s: number, r: any) => 
            s + (Number(r.price) || Number(r.amount) || 0), 0);
          totalOperationsRevenue += (td.otSchedules || []).reduce((s: number, ot: any) => 
            s + ((Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0)), 0);
          
          const emergencyAppointments = (td.emergencyAppointments || []).reduce((s: number, e: any) => 
            s + (Number(e.consultation_fee_at_time) || 0), 0);
          const emergencyInvoices = (td.hospitalInvoices || []).filter((inv: any) =>
            inv?.description?.toLowerCase?.().includes('emergency') ||
            inv?.emergency_patient_data
          );
          const emergencyInvoiceRevenue = emergencyInvoices.reduce((s: number, inv: any) => 
            s + (Number(inv.amount) || 0), 0);
          totalEmergencyRevenue += (emergencyAppointments + emergencyInvoiceRevenue);

          const isEmergencyInv = (inv: any) =>
            inv?.description?.toLowerCase?.().includes('emergency') ||
            inv?.emergency_patient_data ||
            inv?.invoice_number?.startsWith?.('EMG-') ||
            inv?.invoice_number?.startsWith?.('EMERGENCY-');
          const opdConsultation = (td.hospitalInvoices || [])
            .filter((inv: any) => inv.invoice_number?.startsWith?.('INV-') && !isEmergencyInv(inv))
            .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
          const otDoctorExp = (td.otSchedules || []).reduce((s: number, ot: any) => s + (Number(ot.doctor_expense) || 0), 0);
          totalDoctorsRevenue += opdConsultation + otDoctorExp;
        }
      });

      const hospitalProfitWithoutPharmacy = totalHospitalRevenue - totalExpenses;
      const hospitalProfitWithPharmacy = hospitalProfitWithoutPharmacy + totalPharmacyProfit;

      const finalPharmacyInvoicesCount = pharmacyInvoicesCount || 0;
      const finalPharmacyInvoicesAmount = pharmacyInvoices?.reduce((sum, inv) => sum + (Number(inv.final_amount) || 0), 0) || 0;
      const finalPharmacyExpensesCount = pharmacyExpensesCount || 0;
      const finalPharmacyExpensesAmount = pharmacyExpenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
      const totalInvoicesCount = hospitalInvoicesCount || 0;
      const totalInvoicesAmount = hospitalInvoices?.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0) || 0;
      const totalRefunds = refunds?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      const doctorPaymentsPaidCount = doctorPaymentsCount || 0;
      const doctorPaymentsPaidAmount = doctorPayments?.reduce((sum, dp) => sum + (Number(dp.total_earnings) || 0), 0) || 0;

      const recentActivity = dailyClosings.slice(-10).reverse().map(closing => ({
        id: closing.id,
        type: 'Daily Closing',
        amount: (computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue) + closing.pharmacy_profit,
        date: closing.closing_time,
        description: `${closing.day_name} - ${new Date(closing.closing_date).toLocaleDateString()}`
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
    refetchInterval: 10000,
  });
};
