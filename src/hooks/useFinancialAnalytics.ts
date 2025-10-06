import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

interface FinancialMetrics {
  pharmacySales: number;
  pharmacyProfit: number;
  hospitalRevenue: number;
  hospitalProfitWithoutPharmacy: number;
  hospitalProfitWithPharmacy: number;
  operationsRevenue: number;
  labRevenue: number;
  xrayRevenue: number;
  emergencyRevenue: number;
  totalExpenses: number;
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
          hospitalRevenue: 0,
          hospitalProfitWithoutPharmacy: 0,
          hospitalProfitWithPharmacy: 0,
          operationsRevenue: 0,
          labRevenue: 0,
          xrayRevenue: 0,
          emergencyRevenue: 0,
          totalExpenses: 0,
          recentActivity: [],
        };
      }

      // Sum up values from all daily closings in the month
      let totalPharmacySales = 0;
      let totalPharmacyProfit = 0;
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
        
        // Calculate pharmacy sales from transactions_data
        const td = closing.transactions_data as any;
        if (td?.pharmacyInvoices) {
          const positiveInvoices = td.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) >= 0);
          const negativeInvoices = td.pharmacyInvoices.filter((inv: any) => (inv.final_amount || 0) < 0);
          const grossSales = positiveInvoices.reduce((sum: number, inv: any) => 
            sum + Number(inv.final_amount || 0), 0);
          const returns = Math.abs(negativeInvoices.reduce((sum: number, inv: any) => 
            sum + Number(inv.final_amount || 0), 0));
          totalPharmacySales += (grossSales - returns);
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
        hospitalProfitWithPharmacy: hospitalProfitWithPharmacy.toFixed(2)
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
        hospitalRevenue: totalHospitalRevenue,
        hospitalProfitWithoutPharmacy,
        hospitalProfitWithPharmacy,
        operationsRevenue: totalOperationsRevenue,
        labRevenue: totalLabRevenue,
        xrayRevenue: totalXrayRevenue,
        emergencyRevenue: totalEmergencyRevenue,
        totalExpenses,
        recentActivity,
      };
    },
    refetchInterval: 10000,
  });
};