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

export function useFinancialAnalytics() {
  return useQuery({
    queryKey: ['financial-analytics'],
    queryFn: async (): Promise<FinancialMetrics> => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Fetch all financial data
      const [
        { data: invoices },
        { data: pharmacyInvoices },
        { data: labReports },
        { data: otSchedules },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('pharmacy_invoices').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('lab_reports').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('ot_schedules').select('*').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('expenses').select('*').gte('created_at', sixMonthsAgo.toISOString())
      ]);

      // Calculate revenue by source
      const hospitalRevenue = (invoices || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const pharmacyRevenue = (pharmacyInvoices || [])
        .reduce((sum, inv) => sum + Number(inv.final_amount), 0);

      const labRevenue = (labReports || [])
        .filter(report => report.price)
        .reduce((sum, report) => sum + Number(report.price), 0);

      const otRevenue = (otSchedules || [])
        .filter(schedule => schedule.total_cost)
        .reduce((sum, schedule) => sum + Number(schedule.total_cost), 0);

      const totalRevenue = hospitalRevenue + pharmacyRevenue + labRevenue + otRevenue;
      const totalExpenses = (expenses || [])
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

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

      // Aggregate revenue by month
      [...(invoices || []), ...(pharmacyInvoices || []), ...(labReports || []), ...(otSchedules || [])]
        .forEach(item => {
          if (!item.created_at) return;
          const month = format(new Date(item.created_at), 'MMM yyyy');
          if (monthlyData.has(month)) {
            let amount = 0;
            if ('amount' in item && item.status === 'paid') amount = Number(item.amount);
            else if ('final_amount' in item) amount = Number(item.final_amount);
            else if ('price' in item && item.price) amount = Number(item.price);
            else if ('total_cost' in item && item.total_cost) amount = Number(item.total_cost);
            
            monthlyData.set(month, monthlyData.get(month) + amount);
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}