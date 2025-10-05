import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  revenueBySource: {
    hospital: number;
    pharmacy: number;
    lab: number;
    xray: number;
    ot: number;
    miscellaneous: number;
  };
  pharmacyProfit: number;
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

export const useFinancialAnalytics = () => {
  return useQuery<FinancialMetrics>({
    queryKey: ['financial-analytics'],
    queryFn: async () => {
      // Fetch all required data
      const [invoicesRes, pharmacyInvoicesRes, labReportsRes, xrayReportsRes, otSchedulesRes, expensesRes, refundsRes, miscIncomeRes] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('pharmacy_invoices').select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            total_price,
            medicine_id,
            medicines(purchase_price, selling_price)
          )
        `),
        supabase.from('lab_reports').select('*'),
        supabase.from('xray_reports').select('*'),
        supabase.from('ot_schedules').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('refunds').select('*'),
        supabase.from('miscellaneous_income').select('*')
      ]);

      const invoices = invoicesRes.data || [];
      const pharmacyInvoices = pharmacyInvoicesRes.data || [];
      const labReports = labReportsRes.data || [];
      const xrayReports = xrayReportsRes.data || [];
      const otSchedules = otSchedulesRes.data || [];
      const expenses = expensesRes.data || [];
      const refunds = refundsRes.data || [];
      const miscIncome = miscIncomeRes.data || [];

      // Calculate hospital revenue - EXCLUDING regular consultation fees (those go to doctors)
      // Hospital only gets revenue from: EMERGENCY consultations, lab tests, OT hospital portion, pharmacy profit
      // Regular consultations go to doctors, but emergency consultations go to hospital
      const emergencyConsultationRevenue = invoices
        .filter(inv => inv.status === 'paid' && (
          inv.description?.toLowerCase().includes('emergency') ||
          inv.emergency_patient_data
        ))
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      // Calculate pharmacy profit only (not revenue - hospital gets profit share)
      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      
      if (pharmacyInvoices) {
        pharmacyRevenue = pharmacyInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0);
        
        // Calculate actual profit based on selling price - purchase price
        pharmacyProfit = pharmacyInvoices.reduce((totalProfit, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.selling_price && item.medicines.purchase_price) {
              const profitPerUnit = Number(item.medicines.selling_price) - Number(item.medicines.purchase_price);
              // For returns (negative quantities), calculate profit lost
              return itemsProfit + (profitPerUnit * item.quantity);
            }
            return itemsProfit;
          }, 0);
          return totalProfit + invoiceProfit;
        }, 0);
      }

      // Calculate lab revenue from lab reports (all lab orders are paid immediately at counter)
      const labRevenue = labReports
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      // Calculate X-ray revenue from reports with prices (both completed and pending)
      const xrayRevenue = xrayReports
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      // Calculate OT revenue (hospital portion only, excluding doctor expenses)
      const otHospitalRevenue = otSchedules
        .filter(schedule => schedule.total_cost && schedule.doctor_expense)
        .reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);

      // Calculate miscellaneous income
      const miscellaneousIncome = miscIncome.reduce((sum, income) => sum + Number(income.amount), 0);

      // Hospital total revenue = emergency consultations + lab revenue + X-ray revenue + OT hospital portion + pharmacy profit + miscellaneous income
      const hospitalRevenue = emergencyConsultationRevenue + labRevenue + xrayRevenue + otHospitalRevenue + pharmacyProfit + miscellaneousIncome;
      
      // Total revenue is hospital revenue + pharmacy sales (for analytics display)
      const totalRevenue = hospitalRevenue + pharmacyRevenue;
      
      // Total expenses = regular expenses (including refund expense records)
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      const netProfit = hospitalRevenue - totalExpenses; // Hospital profit excluding pharmacy profit (already included in hospitalRevenue)
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate monthly data (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyRevenue = [
        ...invoices.filter(inv => {
          const date = new Date(inv.paid_at || inv.created_at);
          return inv.status === 'paid' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }),
        ...pharmacyInvoices.filter(inv => {
          const date = new Date(inv.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }),
        ...labReports.filter(report => {
          const date = new Date(report.created_at);
          return report.price && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }),
        ...xrayReports.filter(report => {
          const date = new Date(report.created_at);
          return report.price && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }),
        ...otSchedules.filter(schedule => {
          const date = new Date(schedule.created_at);
          return schedule.total_cost && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }),
        ...miscIncome.filter(income => {
          const date = new Date(income.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
      ].reduce((sum, item) => {
        if ('amount' in item) return sum + Number(item.amount);
        if ('final_amount' in item) return sum + Number(item.final_amount);
        if ('price' in item) return sum + Number(item.price || 0);
        if ('total_cost' in item && 'doctor_expense' in item) {
          return sum + (Number(item.total_cost) - Number(item.doctor_expense || 0));
        }
        return sum;
      }, 0);

      const monthlyExpenses = expenses
        .filter(exp => {
          const date = new Date(exp.expense_date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      // Recent activity from all sources
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
        })),
        ...refunds.slice(0, 3).map(refund => ({
          id: refund.id,
          type: getRefundTypeLabel(refund.refund_type),
          amount: -Number(refund.amount),
          date: refund.created_at,
          description: refund.description
        }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        monthlyRevenue,
        monthlyExpenses,
        revenueBySource: {
          hospital: emergencyConsultationRevenue,
          pharmacy: pharmacyRevenue,
          lab: labRevenue,
          xray: xrayRevenue,
          ot: otHospitalRevenue,
          miscellaneous: miscellaneousIncome,
        },
        pharmacyProfit,
        recentActivity,
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};