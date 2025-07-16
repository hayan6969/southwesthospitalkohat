import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyRevenue: Array<{ month: string; amount: number }>;
  monthlyExpenses: Array<{ month: string; amount: number }>;
  revenueBySource: {
    hospital: number;
    pharmacy: number;
    lab: number;
    ot: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
  }>;
}

// Helper function to get refund type labels
const getRefundTypeLabel = (type: string) => {
  const labels = {
    consultation: "Consultation",
    ot_doctor: "OT Doctor", 
    ot_simple: "OT Simple",
    lab: "Lab Report",
    pharmacy: "Pharmacy",
    other: "Other Hospital Services"
  };
  return labels[type as keyof typeof labels] || type;
};

export function useFinancialAnalytics() {
  return useQuery({
    queryKey: ['financial-analytics', Date.now()], // Add timestamp to prevent caching issues
    queryFn: async (): Promise<FinancialMetrics> => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Fetch all financial data
      const [
        { data: invoices },
        { data: pharmacyInvoices },
        { data: labReports },
        { data: otSchedules },
        { data: expenses },
        { data: refunds }
      ] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('pharmacy_invoices').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('lab_reports').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('ot_schedules').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('expenses').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('refunds').select('*').gte('created_at', sixMonthsAgo.toISOString())
      ]);

      // Calculate refunds by category
      // Doctor-related refunds (consultation, ot_doctor) - these reduce doctor earnings
      const doctorRefunds = (refunds || [])
        .filter(refund => ['consultation', 'ot_doctor'].includes(refund.refund_type))
        .reduce((sum, refund) => sum + Number(refund.amount), 0);

      // Hospital-related refunds (ot_simple, lab, pharmacy, other) - these become expenses
      const hospitalRefunds = (refunds || [])
        .filter(refund => ['ot_simple', 'lab', 'pharmacy', 'other'].includes(refund.refund_type))
        .reduce((sum, refund) => sum + Number(refund.amount), 0);

      // Calculate revenue by source (no refund deductions - refunds become expenses)
      const hospitalRevenue = (invoices || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const pharmacyRevenue = (pharmacyInvoices || [])
        .reduce((sum, inv) => sum + Number(inv.final_amount), 0);

      const labRevenue = (labReports || [])
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      // Calculate OT revenue (hospital portion only, excluding doctor expenses)
      const otRevenue = (otSchedules || [])
        .filter(schedule => schedule.total_cost && schedule.doctor_expense)
        .reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);

      const totalRevenue = hospitalRevenue + pharmacyRevenue + labRevenue + otRevenue;
      
      // Total expenses = regular expenses + hospital-related refunds
      const totalExpenses = (expenses || [])
        .reduce((sum, exp) => sum + Number(exp.amount), 0) + hospitalRefunds;

      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate monthly data
      const monthlyData = new Map();
      const expenseData = new Map();

      // Initialize months
      for (let i = 0; i < 6; i++) {
        const month = format(subMonths(now, i), 'MMM yyyy');
        monthlyData.set(month, 0);
        expenseData.set(month, 0);
      }

      // Aggregate revenue by month (excluding doctor expenses from OT)
      [...(invoices || []), ...(pharmacyInvoices || []), ...(labReports || []), ...(otSchedules || [])]
        .forEach(item => {
          if (!item.created_at) return;
          const month = format(new Date(item.created_at), 'MMM yyyy');
          if (monthlyData.has(month)) {
            let amount = 0;
            if ('amount' in item && item.status === 'paid') amount = Number(item.amount);
            else if ('final_amount' in item) amount = Number(item.final_amount);
            else if ('price' in item && item.price) amount = Number(item.price);
            else if ('total_cost' in item && item.total_cost && item.doctor_expense) {
              // OT revenue: total cost minus doctor's portion
              amount = Number(item.total_cost) - Number(item.doctor_expense);
            }
            
            monthlyData.set(month, monthlyData.get(month) + amount);
          }
        });

      // Add hospital-related refunds to monthly expenses
      (refunds || []).forEach(refund => {
        if (!refund.created_at) return;
        // Add hospital-related refunds as expenses
        if (['ot_simple', 'lab', 'pharmacy', 'other'].includes(refund.refund_type)) {
          const month = format(new Date(refund.created_at), 'MMM yyyy');
          if (expenseData.has(month)) {
            expenseData.set(month, expenseData.get(month) + Number(refund.amount));
          }
        }
      });

      // Aggregate expenses by month
      (expenses || []).forEach(expense => {
        if (!expense.created_at) return;
        const month = format(new Date(expense.created_at), 'MMM yyyy');
        if (expenseData.has(month)) {
          expenseData.set(month, expenseData.get(month) + Number(expense.amount));
        }
      });

      // Recent activities (last 10 transactions)
      const recentActivities = [
        ...(invoices || []).slice(-5).map(inv => ({
          id: inv.id,
          type: 'Hospital Revenue',
          amount: Number(inv.amount),
          description: `Invoice ${inv.invoice_number}`,
          date: inv.created_at || ''
        })),
        ...(expenses || []).slice(-5).map(exp => ({
          id: exp.id,
          type: 'Expense',
          amount: -Number(exp.amount),
          description: exp.description,
          date: exp.created_at || ''
        })),
        ...(refunds || []).slice(-5).map(refund => ({
          id: refund.id,
          type: 'Refund',
          amount: -Number(refund.amount),
          description: `${getRefundTypeLabel(refund.refund_type)} refund: ${refund.description}`,
          date: refund.created_at || ''
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        monthlyRevenue: Array.from(monthlyData.entries()).map(([month, amount]) => ({ month, amount })).reverse(),
        monthlyExpenses: Array.from(expenseData.entries()).map(([month, amount]) => ({ month, amount })).reverse(),
        revenueBySource: {
          hospital: hospitalRevenue,
          pharmacy: pharmacyRevenue,
          lab: labRevenue,
          ot: otRevenue
        },
        recentActivities
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
}