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
      const monthStartISO = monthStart.toISOString();
      const monthEndISO = monthEnd.toISOString();
      // Fetch data for the selected month
      const [invoicesRes, pharmacyInvoicesRes, labReportsRes, xrayReportsRes, otSchedulesRes, expensesRes, miscIncomeRes] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('pharmacy_invoices').select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            medicines(purchase_price)
          )
        `).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('lab_reports').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('xray_reports').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('ot_schedules').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('expenses').select('*').gte('expense_date', monthStart.toISOString().split('T')[0]).lte('expense_date', monthEnd.toISOString().split('T')[0]),
        supabase.from('miscellaneous_income').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO)
      ]);

      const invoices = invoicesRes.data || [];
      const pharmacyInvoices = pharmacyInvoicesRes.data || [];
      const labReports = labReportsRes.data || [];
      const xrayReports = xrayReportsRes.data || [];
      const otSchedules = otSchedulesRes.data || [];
      const expenses = expensesRes.data || [];
      const miscIncome = miscIncomeRes.data || [];

      // 1. Emergency Revenue
      const emergencyRevenue = invoices
        .filter(inv => inv.status === 'paid' && (
          inv.description?.toLowerCase().includes('emergency') ||
          inv.emergency_patient_data
        ))
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      // 2. Pharmacy Sales and Profit (using unit_price which includes discounts)
      let pharmacySales = 0;
      let pharmacyProfit = 0;
      
      const positivePharmacyInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) >= 0);
      const negativePharmacyInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) < 0);

      // Calculate sales
      pharmacySales = positivePharmacyInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0);

      // Calculate profit from sales (using actual unit_price after discounts)
      const grossProfit = positivePharmacyInvoices.reduce((total, inv) => {
        const items = inv.pharmacy_invoice_items || [];
        const invProfit = items.reduce((sum, item) => {
          const purchase = item.medicines?.purchase_price || 0;
          const profitPerUnit = item.unit_price - purchase; // unit_price includes discounts
          return sum + profitPerUnit * item.quantity;
        }, 0);
        return total + invProfit;
      }, 0);

      // Subtract profit lost from returns
      const returnsProfit = negativePharmacyInvoices.reduce((total, inv) => {
        const items = inv.pharmacy_invoice_items || [];
        const invProfit = items.reduce((sum, item) => {
          const purchase = item.medicines?.purchase_price || 0;
          const profitPerUnit = item.unit_price - purchase;
          return sum + profitPerUnit * Math.abs(item.quantity);
        }, 0);
        return total + invProfit;
      }, 0);

      pharmacyProfit = grossProfit - returnsProfit;

      // 3. Lab Revenue
      const labRevenue = labReports
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      // 4. X-ray Revenue
      const xrayRevenue = xrayReports
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      // 5. Operations Revenue (hospital portion only)
      const operationsRevenue = otSchedules
        .filter(schedule => schedule.total_cost && schedule.doctor_expense)
        .reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);

      // 6. Miscellaneous Income
      const miscellaneousIncome = miscIncome.reduce((sum, income) => sum + Number(income.amount), 0);

      // 7. Total Hospital Revenue (without pharmacy sales, only pharmacy profit)
      const hospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + operationsRevenue + miscellaneousIncome;
      
      // 8. Total Expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      // 9. Hospital Profit Without Pharmacy
      const hospitalProfitWithoutPharmacy = hospitalRevenue - totalExpenses;
      
      // 10. Hospital Profit With Pharmacy Profit
      const hospitalProfitWithPharmacy = hospitalProfitWithoutPharmacy + pharmacyProfit;

      // Recent activity
      const recentActivity = [
        ...invoices.slice(0, 5).map(inv => ({
          id: inv.id,
          type: 'Hospital Invoice',
          amount: Number(inv.amount),
          date: inv.created_at,
          description: `Invoice #${inv.invoice_number}`
        })),
        ...pharmacyInvoices.slice(0, 5).map(inv => ({
          id: inv.id,
          type: 'Pharmacy Sale',
          amount: Number(inv.final_amount),
          date: inv.created_at,
          description: `Pharmacy Invoice #${inv.invoice_number}`
        }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      return {
        pharmacySales,
        pharmacyProfit,
        hospitalRevenue,
        hospitalProfitWithoutPharmacy,
        hospitalProfitWithPharmacy,
        operationsRevenue,
        labRevenue,
        xrayRevenue,
        emergencyRevenue,
        totalExpenses,
        recentActivity,
      };
    },
    refetchInterval: 10000,
  });
};