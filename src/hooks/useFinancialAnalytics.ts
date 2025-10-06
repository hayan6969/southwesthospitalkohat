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
      const [invoicesRes, emergencyApptsRes, pharmacyInvoicesRes, labReportsRes, xrayReportsRes, otSchedulesRes, expensesRes, miscIncomeRes] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('appointments').select('consultation_fee_at_time, type, status, appointment_date')
          .ilike('type', 'emergency')
          .eq('status', 'completed')
          .gte('appointment_date', monthStartISO)
          .lte('appointment_date', monthEndISO),
        supabase.from('pharmacy_invoices').select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            medicines(purchase_price)
          )
        `).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('lab_reports').select('price, created_at').not('price', 'is', null).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('xray_reports').select('price, created_at').not('price', 'is', null).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('ot_schedules').select('total_cost, doctor_expense, created_at, status').in('status', ['completed', 'pending']).gte('created_at', monthStartISO).lte('created_at', monthEndISO),
        supabase.from('expenses').select('*').gte('expense_date', monthStart.toISOString().split('T')[0]).lte('expense_date', monthEnd.toISOString().split('T')[0]),
        supabase.from('miscellaneous_income').select('*').gte('created_at', monthStartISO).lte('created_at', monthEndISO)
      ]);

      const invoices = invoicesRes.data || [];
      const emergencyAppointments = emergencyApptsRes.data || [];
      const pharmacyInvoices = pharmacyInvoicesRes.data || [];
      const labReports = labReportsRes.data || [];
      const xrayReports = xrayReportsRes.data || [];
      const otSchedules = otSchedulesRes.data || [];
      const expenses = expensesRes.data || [];
      const miscIncome = miscIncomeRes.data || [];

      console.log('📊 Financial Analytics Data:', {
        invoices: invoices.length,
        emergencyAppointments: emergencyAppointments.length,
        pharmacyInvoices: pharmacyInvoices.length,
        labReports: labReports.length,
        xrayReports: xrayReports.length,
        otSchedules: otSchedules.length,
        expenses: expenses.length,
        miscIncome: miscIncome.length
      });

      // 1. Emergency Revenue (from both appointments and invoices)
      const emergencyAppointmentRevenue = emergencyAppointments.reduce((sum, apt) => 
        sum + Number(apt.consultation_fee_at_time || 0), 0);
      
      const emergencyInvoiceRevenue = invoices
        .filter(inv => inv.status === 'paid' && (
          inv.description?.toLowerCase().includes('emergency') ||
          inv.emergency_patient_data
        ))
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      
      const emergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;

      // 2. Pharmacy Sales and Profit (matching FinanceDaily calculation exactly)
      let pharmacySales = 0;
      let pharmacyProfit = 0;
      
      const positivePharmacyInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) >= 0);
      const negativePharmacyInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) < 0);

      // Calculate gross sales from positive invoices
      const grossPharmacySales = positivePharmacyInvoices.reduce((sum, inv) => 
        sum + Number(inv.final_amount || 0), 0);
      
      // Calculate return amounts (make positive)
      const pharmacyReturns = Math.abs(negativePharmacyInvoices.reduce((sum, inv) => 
        sum + Number(inv.final_amount || 0), 0));
      
      // Net sales after subtracting returns
      pharmacySales = grossPharmacySales - pharmacyReturns;

      // Calculate gross profit from positive sales (using unit_price which includes discounts)
      const grossProfit = positivePharmacyInvoices.reduce((totalProfit, invoice) => {
        const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
          if (item.medicines && item.medicines.purchase_price) {
            const profitPerUnit = item.unit_price - Number(item.medicines.purchase_price);
            return itemsProfit + (profitPerUnit * item.quantity);
          }
          return itemsProfit;
        }, 0);
        return totalProfit + invoiceProfit;
      }, 0);

      // Calculate profit lost from returns
      const returnsProfit = negativePharmacyInvoices.reduce((totalProfit, invoice) => {
        const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
          if (item.medicines && item.medicines.purchase_price) {
            const profitPerUnit = item.unit_price - Number(item.medicines.purchase_price);
            return itemsProfit + (profitPerUnit * Math.abs(item.quantity));
          }
          return itemsProfit;
        }, 0);
        return totalProfit + invoiceProfit;
      }, 0);

      // Net profit after subtracting profit lost from returns
      pharmacyProfit = grossProfit - returnsProfit;

      // 3. Lab Revenue (direct sum of all lab prices)
      const labRevenue = labReports.reduce((sum, lab) => 
        sum + Number(lab.price || 0), 0);

      // 4. X-ray Revenue (direct sum of all xray prices)
      const xrayRevenue = xrayReports.reduce((sum, xray) => 
        sum + Number(xray.price || 0), 0);

      // 5. Operations Revenue (hospital portion only: total_cost - doctor_expense)
      const operationsRevenue = otSchedules.reduce((sum, ot) => 
        sum + (Number(ot.total_cost || 0) - Number(ot.doctor_expense || 0)), 0);

      // 6. Miscellaneous Income
      const miscellaneousIncome = miscIncome.reduce((sum, income) => 
        sum + Number(income.amount || 0), 0);

      // 7. Total Hospital Revenue = emergency + lab + xray + operations + misc
      // (Does NOT include pharmacy sales - only pharmacy profit counts for hospital)
      const hospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + operationsRevenue + miscellaneousIncome;
      
      // 8. Total Expenses
      const totalExpenses = expenses.reduce((sum, exp) => 
        sum + Number(exp.amount || 0), 0);
      
      // 9. Hospital Profit Without Pharmacy = Hospital Revenue - Expenses
      const hospitalProfitWithoutPharmacy = hospitalRevenue - totalExpenses;
      
      // 10. Hospital Profit With Pharmacy = Hospital Profit + Pharmacy Profit
      const hospitalProfitWithPharmacy = hospitalProfitWithoutPharmacy + pharmacyProfit;

      console.log('💰 Calculated Financial Metrics:', {
        emergencyRevenue: emergencyRevenue.toFixed(2),
        emergencyAppointments: emergencyAppointmentRevenue.toFixed(2),
        emergencyInvoices: emergencyInvoiceRevenue.toFixed(2),
        pharmacySales: pharmacySales.toFixed(2),
        pharmacyProfit: pharmacyProfit.toFixed(2),
        labRevenue: labRevenue.toFixed(2),
        xrayRevenue: xrayRevenue.toFixed(2),
        operationsRevenue: operationsRevenue.toFixed(2),
        miscellaneousIncome: miscellaneousIncome.toFixed(2),
        hospitalRevenue: hospitalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        hospitalProfitWithoutPharmacy: hospitalProfitWithoutPharmacy.toFixed(2),
        hospitalProfitWithPharmacy: hospitalProfitWithPharmacy.toFixed(2)
      });

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