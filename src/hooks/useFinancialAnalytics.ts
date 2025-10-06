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
  totalExpenses: number;
  pharmacyBillsPaidCount: number;
  pharmacyBillsPaidAmount: number;
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

export const useFinancialAnalytics = (selectedMonth?: Date) => {
  return useQuery<FinancialMetrics>({
    queryKey: ['financial-analytics', selectedMonth?.toISOString()],
    queryFn: async () => {
      // Determine date range
      const targetDate = selectedMonth || new Date();
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);
      
      // Format dates for the daily_closings query (YYYY-MM-DD format)
      const monthStartDate = monthStart.toISOString().split('T')[0];
      const monthEndDate = monthEnd.toISOString().split('T')[0];

      // ISO format for timestamp queries
      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();

      console.log('📅 Fetching closings for month:', monthStartDate, 'to', monthEndDate);
      
      // Fetch daily closings for the selected month - this is the CORRECT source of truth
      const { data: dailyClosings, error: closingsError } = await supabase
        .from('daily_closings')
        .select('*')
        .gte('closing_date', monthStartDate)
        .lte('closing_date', monthEndDate)
        .order('closing_date', { ascending: true });

      if (closingsError) {
        console.error('Error fetching daily closings:', closingsError);
        throw closingsError;
      }

      console.log('📊 Found', dailyClosings?.length || 0, 'daily closings for the month');

      // Count pharmacy invoices for the month (completed invoices)
      const { count: pharmacyBillsCount } = await supabase
        .from('pharmacy_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'completed');

      // Get sum of pharmacy invoice amounts
      const { data: pharmacyInvoices } = await supabase
        .from('pharmacy_invoices')
        .select('final_amount')
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'completed');

      // Count payroll records for the month
      const { count: payrollsCount } = await supabase
        .from('payroll')
        .select('*', { count: 'exact', head: true })
        .eq('pay_period', format(targetDate, 'MMMM yyyy'))
        .eq('status', 'paid');

      // Get sum of payroll amounts
      const { data: payrolls } = await supabase
        .from('payroll')
        .select('net_salary')
        .eq('pay_period', format(targetDate, 'MMMM yyyy'))
        .eq('status', 'paid');

      // Count hospital invoices for the month
      const { count: hospitalInvoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'paid');

      // Get sum of hospital invoice amounts
      const { data: hospitalInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO)
        .eq('status', 'paid');

      // Get sum of refunds for the month
      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount')
        .gte('created_at', monthStartISO)
        .lte('created_at', monthEndISO);

      // Count doctor payments for the month
      const { count: doctorPaymentsCount } = await supabase
        .from('doctor_payments')
        .select('*', { count: 'exact', head: true })
        .gte('period_start', monthStartDate)
        .lte('period_end', monthEndDate);

      // Get sum of doctor payment amounts
      const { data: doctorPayments } = await supabase
        .from('doctor_payments')
        .select('total_earnings')
        .gte('period_start', monthStartDate)
        .lte('period_end', monthEndDate);

      // Helper function to recalculate hospital services revenue from transactions_data
      // (matches the logic in PreviousClosingsDialog.tsx)
      const computeServicesRevenue = (td?: any): number => {
        if (!td) return 0;
        const lab = (td.labReports || []).reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
        const xray = (td.xrayReports || []).reduce((s: number, r: any) => s + (Number(r.price) || 0), 0);
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

      // Calculate totals from daily closings (this is the CORRECT way - matches what users see)
      if (!dailyClosings || dailyClosings.length === 0) {
        console.warn('⚠️ No daily closings found for this month');
        // Return zeros if no closings
        return {
          pharmacySales: 0,
          pharmacyProfit: 0,
          pharmacyReturns: 0,
          hospitalRevenue: 0,
          hospitalProfitWithoutPharmacy: 0,
          hospitalProfitWithPharmacy: 0,
          operationsRevenue: 0,
          labRevenue: 0,
          xrayRevenue: 0,
          emergencyRevenue: 0,
          totalExpenses: 0,
          pharmacyBillsPaidCount: 0,
          pharmacyBillsPaidAmount: 0,
          totalInvoicesCount: 0,
          totalInvoicesAmount: 0,
          totalRefunds: 0,
          doctorPaymentsPaidCount: 0,
          doctorPaymentsPaidAmount: 0,
          recentActivity: [],
        };
      }

      // Sum up values from all daily closings in the month
      let totalPharmacySales = 0;
      let totalPharmacyProfit = 0;
      let totalPharmacyReturns = 0;
      let totalHospitalRevenue = 0;
      let totalExpenses = 0;
      let totalLabRevenue = 0;
      let totalXrayRevenue = 0;
      let totalOperationsRevenue = 0;
      let totalEmergencyRevenue = 0;

      dailyClosings.forEach(closing => {
        // Use computed hospital revenue (recalculated from transactions_data)
        const hospitalRev = computeServicesRevenue(closing.transactions_data) || closing.hospital_revenue;
        totalHospitalRevenue += hospitalRev;
        totalPharmacyProfit += Number(closing.pharmacy_profit || 0);
        totalExpenses += Number(closing.total_expenses || 0);
        
        // Calculate pharmacy sales and returns from transactions_data
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
        
        // Extract breakdown from transactions_data
        if (td) {
          totalLabRevenue += (td.labReports || []).reduce((s: number, r: any) => 
            s + (Number(r.price) || 0), 0);
          totalXrayRevenue += (td.xrayReports || []).reduce((s: number, r: any) => 
            s + (Number(r.price) || 0), 0);
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
        }
      });

      // Calculate profits
      const hospitalProfitWithoutPharmacy = totalHospitalRevenue - totalExpenses;
      const hospitalProfitWithPharmacy = hospitalProfitWithoutPharmacy + totalPharmacyProfit;

      // Calculate additional metrics using counts and sums
      const pharmacyBillsPaidCount = pharmacyBillsCount || 0;
      const pharmacyBillsPaidAmount = pharmacyInvoices?.reduce((sum, inv) => sum + (Number(inv.final_amount) || 0), 0) || 0;
      
      const payrollsPaidCount = payrollsCount || 0;
      const payrollsPaidAmount = payrolls?.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0) || 0;
      
      const totalInvoicesCount = hospitalInvoicesCount || 0;
      const totalInvoicesAmount = hospitalInvoices?.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0) || 0;
      
      const totalRefunds = refunds?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
      
      const doctorPaymentsPaidCount = doctorPaymentsCount || 0;
      const doctorPaymentsPaidAmount = doctorPayments?.reduce((sum, dp) => sum + (Number(dp.total_earnings) || 0), 0) || 0;

      console.log('💰 Calculated Financial Metrics from Daily Closings:', {
        closingsCount: dailyClosings.length,
        pharmacySales: totalPharmacySales.toFixed(2),
        pharmacyProfit: totalPharmacyProfit.toFixed(2),
        hospitalRevenue: totalHospitalRevenue.toFixed(2),
        labRevenue: totalLabRevenue.toFixed(2),
        xrayRevenue: totalXrayRevenue.toFixed(2),
        operationsRevenue: totalOperationsRevenue.toFixed(2),
        emergencyRevenue: totalEmergencyRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        hospitalProfitWithoutPharmacy: hospitalProfitWithoutPharmacy.toFixed(2),
        hospitalProfitWithPharmacy: hospitalProfitWithPharmacy.toFixed(2),
        pharmacyBillsPaidCount,
        payrollsPaidCount,
        totalInvoicesCount,
        totalRefunds: totalRefunds.toFixed(2),
        doctorPaymentsPaidCount
      });

      // Recent activity from daily closings
      const recentActivity: Array<{
        id: string;
        type: string;
        amount: number;
        date: string;
        description: string;
      }> = dailyClosings.slice(0, 10).map(closing => ({
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
        totalExpenses,
        pharmacyBillsPaidCount,
        pharmacyBillsPaidAmount,
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