import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subDays } from "date-fns";

export interface PharmacyAnalytics {
  // Today's data
  todayRevenue: number;
  todayProfit: number;
  todayReturns: number;
  todaySales: number;
  
  // Monthly data
  monthlyRevenue: number;
  monthlyProfit: number;
  monthlyReturns: number;
  monthlySales: number;
  
  // Detailed analytics
  dailyData: Array<{
    date: string;
    revenue: number;
    profit: number;
    returns: number;
    sales: number;
  }>;
  
  topMedicines: Array<{
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  
  recentActivity: Array<{
    id: string;
    type: 'sale' | 'return';
    amount: number;
    date: string;
    description: string;
  }>;
  
  // Stock analysis
  totalMedicines: number;
  lowStockCount: number;
  expiredCount: number;
  
  // Profit margins
  overallProfitMargin: number;
  monthlyProfitMargin: number;
}

export const usePharmacyAnalytics = () => {
  return useQuery({
    queryKey: ['pharmacy-analytics'],
    queryFn: async (): Promise<PharmacyAnalytics> => {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      const startOfThisMonth = startOfMonth(today);
      const endOfThisMonth = endOfMonth(today);

      // Fetch all data in parallel
      const [
        medicinesResult,
        invoicesResult,
        invoiceItemsResult,
        expensesResult
      ] = await Promise.all([
        supabase.from('medicines').select('*'),
        supabase
          .from('pharmacy_invoices')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('pharmacy_invoice_items')
          .select('*, medicines!inner(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('pharmacy_expenses')
          .select('*')
          .eq('expense_type', 'return')
      ]);

      const medicines = medicinesResult.data || [];
      const allInvoices = invoicesResult.data || [];
      const allInvoiceItems = invoiceItemsResult.data || [];
      const returnExpenses = expensesResult.data || [];

      // Separate sales and returns based on amount (negative amounts are returns)
      const salesInvoices = allInvoices.filter(inv => inv.final_amount >= 0);
      const returnInvoices = allInvoices.filter(inv => inv.final_amount < 0);

      // Today's calculations
      const todaySalesInvoices = salesInvoices.filter(inv => 
        new Date(inv.created_at) >= startOfToday && new Date(inv.created_at) <= endOfToday
      );
      const todayReturnInvoices = returnInvoices.filter(inv => 
        new Date(inv.created_at) >= startOfToday && new Date(inv.created_at) <= endOfToday
      );
      const todayReturnExpenses = returnExpenses.filter(exp => 
        new Date(exp.expense_date) >= startOfToday && new Date(exp.expense_date) <= endOfToday
      );

      const todayRevenue = todaySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const todayReturns = Math.abs(todayReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                           todayReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const todaySales = todaySalesInvoices.length;

      // Calculate today's profit
      const todayInvoiceItems = allInvoiceItems.filter(item => {
        const invoiceDate = new Date(item.created_at);
        return invoiceDate >= startOfToday && invoiceDate <= endOfToday && item.unit_price > 0;
      });
      const todayProfit = todayInvoiceItems.reduce((sum, item) => {
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0) - todayReturns;

      // Monthly calculations
      const monthlySalesInvoices = salesInvoices.filter(inv => 
        new Date(inv.created_at) >= startOfThisMonth && new Date(inv.created_at) <= endOfThisMonth
      );
      const monthlyReturnInvoices = returnInvoices.filter(inv => 
        new Date(inv.created_at) >= startOfThisMonth && new Date(inv.created_at) <= endOfThisMonth
      );
      const monthlyReturnExpenses = returnExpenses.filter(exp => 
        new Date(exp.expense_date) >= startOfThisMonth && new Date(exp.expense_date) <= endOfThisMonth
      );

      const monthlyRevenue = monthlySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const monthlyReturns = Math.abs(monthlyReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                            monthlyReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const monthlySales = monthlySalesInvoices.length;

      // Calculate monthly profit
      const monthlyInvoiceItems = allInvoiceItems.filter(item => {
        const invoiceDate = new Date(item.created_at);
        return invoiceDate >= startOfThisMonth && invoiceDate <= endOfThisMonth && item.unit_price > 0;
      });
      const monthlyProfit = monthlyInvoiceItems.reduce((sum, item) => {
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0) - monthlyReturns;

      // Daily data for charts (last 30 days)
      const dailyData = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const daySalesInvoices = salesInvoices.filter(inv => 
          new Date(inv.created_at) >= dayStart && new Date(inv.created_at) <= dayEnd
        );
        const dayReturnInvoices = returnInvoices.filter(inv => 
          new Date(inv.created_at) >= dayStart && new Date(inv.created_at) <= dayEnd
        );
        const dayReturnExpenses = returnExpenses.filter(exp => 
          new Date(exp.expense_date) >= dayStart && new Date(exp.expense_date) <= dayEnd
        );
        
        const dayRevenue = daySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
        const dayReturns = Math.abs(dayReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                          dayReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const daySales = daySalesInvoices.length;
        
        const dayInvoiceItems = allInvoiceItems.filter(item => {
          const invoiceDate = new Date(item.created_at);
          return invoiceDate >= dayStart && invoiceDate <= dayEnd && item.unit_price > 0;
        });
        const dayProfit = dayInvoiceItems.reduce((sum, item) => {
          const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
          return sum + profit;
        }, 0) - dayReturns;

        dailyData.push({
          date: format(date, 'MMM dd'),
          revenue: dayRevenue,
          profit: dayProfit,
          returns: dayReturns,
          sales: daySales,
        });
      }

      // Top medicines (exclude returns)
      const medicinesSold = new Map();
      allInvoiceItems
        .filter(item => item.unit_price > 0) // Only sales, not returns
        .forEach(item => {
          const medicineName = item.medicines?.name || 'Unknown';
          const medicineId = item.medicine_id;
          const current = medicinesSold.get(medicineId) || { 
            name: medicineName, 
            quantity: 0, 
            revenue: 0, 
            profit: 0 
          };
          
          const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
          
          medicinesSold.set(medicineId, {
            name: medicineName,
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + item.total_price,
            profit: current.profit + profit
          });
        });

      const topMedicines = Array.from(medicinesSold.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Recent activity
      const recentActivity = [
        ...salesInvoices.slice(0, 5).map(inv => ({
          id: inv.id,
          type: 'sale' as const,
          amount: inv.final_amount,
          date: inv.created_at,
          description: `Sale #${inv.invoice_number} - ${inv.customer_name || 'Walk-in'}`
        })),
        ...returnInvoices.slice(0, 3).map(inv => ({
          id: inv.id,
          type: 'return' as const,
          amount: Math.abs(inv.final_amount),
          date: inv.created_at,
          description: `Return #${inv.invoice_number}`
        })),
        ...todayReturnExpenses.slice(0, 2).map(exp => ({
          id: exp.id,
          type: 'return' as const,
          amount: exp.amount,
          date: exp.created_at,
          description: `Return: ${exp.description || 'Medicine return'}`
        }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Stock analysis
      const totalMedicines = medicines.length;
      const lowStockCount = medicines.filter(m => m.stock_quantity <= (m.minimum_stock_level || 10)).length;
      const expiredCount = medicines.filter(m => new Date(m.expiry_date) < new Date()).length;

      // Profit margins
      const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const totalReturns = Math.abs(returnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                          returnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalProfit = allInvoiceItems
        .filter(item => item.unit_price > 0)
        .reduce((sum, item) => {
          const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
          return sum + profit;
        }, 0) - totalReturns;

      const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const monthlyProfitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

      return {
        todayRevenue,
        todayProfit,
        todayReturns,
        todaySales,
        monthlyRevenue,
        monthlyProfit,
        monthlyReturns,
        monthlySales,
        dailyData,
        topMedicines,
        recentActivity,
        totalMedicines,
        lowStockCount,
        expiredCount,
        overallProfitMargin,
        monthlyProfitMargin,
      };
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
  });
};