import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subDays } from "date-fns";
import { getCurrentPakistanTime, toPakistanTime } from "@/utils/timezone";

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
  
  // Hospital payment
  payHospitalAmount: number;
  
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
      // Use Pakistan timezone for all date calculations
      const pakistanToday = getCurrentPakistanTime();
      console.log('Current Pakistan Time:', pakistanToday, 'Date:', pakistanToday.toDateString());
      const startOfToday = startOfDay(pakistanToday);
      const endOfToday = endOfDay(pakistanToday);
      console.log('Today range:', startOfToday, 'to', endOfToday);
      const startOfThisMonth = startOfMonth(pakistanToday);
      const endOfThisMonth = endOfMonth(pakistanToday);

      // Fetch all data in parallel
      const [
        medicinesResult,
        invoicesResult,
        expensesResult,
        lastClosingResult
      ] = await Promise.all([
        supabase.from('medicines').select('*').limit(5000),
        supabase
          .from('pharmacy_invoices')
          .select('*, pharmacy_invoice_items(quantity, unit_price, total_price, medicine_id, medicines(purchase_price, selling_price, name))')
          .order('created_at', { ascending: false }),
        supabase
          .from('pharmacy_expenses')
          .select('*')
          .eq('expense_type', 'return'),
        supabase
          .from('daily_closings')
          .select('closing_date, closing_time')
          .order('closing_date', { ascending: false })
          .limit(1)
      ]);

      const medicines = medicinesResult.data || [];
      const allInvoices = invoicesResult.data || [];
      const returnExpenses = expensesResult.data || [];
      const lastClosing = lastClosingResult.data?.[0];

      // Flatten invoice items for easier processing
      const allInvoiceItems: any[] = [];
      allInvoices.forEach(invoice => {
        if (invoice.pharmacy_invoice_items) {
          invoice.pharmacy_invoice_items.forEach((item: any) => {
            allInvoiceItems.push({
              ...item,
              created_at: invoice.created_at,
              invoice_id: invoice.id
            });
          });
        }
      });

      // Separate sales and returns based on amount (negative amounts are returns)
      const salesInvoices = allInvoices.filter(inv => inv.final_amount >= 0);
      const returnInvoices = allInvoices.filter(inv => inv.final_amount < 0);

      // Today's calculations (using Pakistan timezone)
      console.log('Total sales invoices:', salesInvoices.length);
      console.log('Sample invoice dates:', salesInvoices.slice(0, 3).map(inv => ({
        invoice: inv.invoice_number,
        created_at: inv.created_at,
        pakistan_time: toPakistanTime(new Date(inv.created_at))
      })));
      
      const todaySalesInvoices = salesInvoices.filter(inv => {
        const invDate = new Date(inv.created_at);
        const invPakistanTime = toPakistanTime(invDate);
        const isToday = invPakistanTime >= startOfToday && invPakistanTime <= endOfToday;
        if (isToday) {
          console.log('✅ Today sale found:', inv.invoice_number, 'at', invPakistanTime, 'amount:', inv.final_amount);
        }
        return isToday;
      });
      console.log('Found', todaySalesInvoices.length, 'sales for today');
      const todayReturnInvoices = returnInvoices.filter(inv => {
        const invPakistanTime = toPakistanTime(new Date(inv.created_at));
        return invPakistanTime >= startOfToday && invPakistanTime <= endOfToday;
      });
      const todayReturnExpenses = returnExpenses.filter(exp => {
        const expPakistanTime = toPakistanTime(new Date(exp.expense_date));
        return expPakistanTime >= startOfToday && expPakistanTime <= endOfToday;
      });

      const todayGrossRevenue = todaySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const todayRevenue = todayGrossRevenue - Math.abs(todayReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0));
      const todayReturns = Math.abs(todayReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                           todayReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const todaySales = todaySalesInvoices.length;

      // Calculate today's profit - include both sales and returns properly
      const todayAllInvoiceItems = allInvoiceItems.filter(item => {
        const invoicePakistanTime = toPakistanTime(new Date(item.created_at));
        return invoicePakistanTime >= startOfToday && invoicePakistanTime <= endOfToday;
      });
      const todayProfit = todayAllInvoiceItems.reduce((sum, item) => {
        // For returns, quantities are negative, so this automatically subtracts profit lost
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0);

      // Monthly calculations (current calendar month using Pakistan timezone)
      const monthlySalesInvoices = salesInvoices.filter(inv => {
        const invDate = toPakistanTime(new Date(inv.created_at));
        return invDate >= startOfThisMonth && invDate <= endOfThisMonth;
      });
      const monthlyReturnInvoices = returnInvoices.filter(inv => {
        const invDate = toPakistanTime(new Date(inv.created_at));
        return invDate >= startOfThisMonth && invDate <= endOfThisMonth;
      });
      const monthlyReturnExpenses = returnExpenses.filter(exp => {
        const expDate = toPakistanTime(new Date(exp.expense_date));
        return expDate >= startOfThisMonth && expDate <= endOfThisMonth;
      });

      const monthlyGrossRevenue = monthlySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const monthlyRevenue = monthlyGrossRevenue - Math.abs(monthlyReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0));
      const monthlyReturns = Math.abs(monthlyReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                            monthlyReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const monthlySales = monthlySalesInvoices.length;

      // Calculate monthly profit - include both sales and returns properly
      const monthlyAllInvoiceItems = allInvoiceItems.filter(item => {
        const invoiceDate = toPakistanTime(new Date(item.created_at));
        return invoiceDate >= startOfThisMonth && invoiceDate <= endOfThisMonth;
      });
      const monthlyProfit = monthlyAllInvoiceItems.reduce((sum, item) => {
        // For returns, quantities are negative, so this automatically subtracts profit lost
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0);

      // Daily data for charts (last 30 days)
      const dailyData = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(pakistanToday, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const daySalesInvoices = salesInvoices.filter(inv => {
          const invDate = toPakistanTime(new Date(inv.created_at));
          return invDate >= dayStart && invDate <= dayEnd;
        });
        const dayReturnInvoices = returnInvoices.filter(inv => {
          const invDate = toPakistanTime(new Date(inv.created_at));
          return invDate >= dayStart && invDate <= dayEnd;
        });
        const dayReturnExpenses = returnExpenses.filter(exp => {
          const expDate = toPakistanTime(new Date(exp.expense_date));
          return expDate >= dayStart && expDate <= dayEnd;
        });
        
        const dayRevenue = daySalesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
        const dayReturns = Math.abs(dayReturnInvoices.reduce((sum, inv) => sum + inv.final_amount, 0)) + 
                          dayReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const daySales = daySalesInvoices.length;
        
        const dayInvoiceItems = allInvoiceItems.filter(item => {
          const invoiceDate = toPakistanTime(new Date(item.created_at));
          return invoiceDate >= dayStart && invoiceDate <= dayEnd && item.unit_price > 0;
        });
        
        // Calculate profit correctly - include both positive sales and negative returns
        const dayProfit = dayInvoiceItems.reduce((sum, item) => {
          // For returns, quantities are negative, so this automatically subtracts profit lost
          const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
          return sum + profit;
        }, 0);
        
        // Also handle return expenses separately  
        const dayReturnExpenseAmount = dayReturnExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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

      // Profit margins - calculate overall profit correctly
      const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.final_amount, 0);
      const totalProfit = allInvoiceItems.reduce((sum, item) => {
        // For returns, quantities are negative, so this automatically subtracts profit lost
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0);

      const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const monthlyProfitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

      // Calculate amount to pay hospital (profit since last closing)
      // Hospital gets the pharmacy profit share since last daily closing
      const lastClosingTime = lastClosing ? toPakistanTime(new Date(lastClosing.closing_time)) : new Date(0);
      
      // Get sales invoices since last closing (comparing Pakistani time)
      const sinceClosingSalesInvoices = salesInvoices.filter(inv => {
        const invoiceDate = toPakistanTime(new Date(inv.created_at));
        return invoiceDate > lastClosingTime;
      });
      
      // Calculate profit from all invoice items since last closing (including returns)
      const sinceClosingInvoiceItems = allInvoiceItems.filter(item => {
        const invoiceDate = toPakistanTime(new Date(item.created_at));
        return invoiceDate > lastClosingTime;
      });
      
      const sinceClosingProfit = sinceClosingInvoiceItems.reduce((sum, item) => {
        // For returns, quantities are negative, so this automatically subtracts profit lost
        const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
        return sum + profit;
      }, 0);
      
      // Get pharmacy expenses since last closing
      const sinceClosingPharmacyExpenses = returnExpenses.filter(exp => {
        const expDate = toPakistanTime(new Date(exp.expense_date));
        return expDate > lastClosingTime;
      }).reduce((sum, exp) => sum + exp.amount, 0);
      
      // Hospital gets the net profit since last closing minus pharmacy expenses
      const payHospitalAmount = Math.max(0, sinceClosingProfit - sinceClosingPharmacyExpenses);

      return {
        todayRevenue,
        todayProfit,
        todayReturns,
        todaySales,
        monthlyRevenue,
        monthlyProfit,
        monthlyReturns,
        monthlySales,
        payHospitalAmount,
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