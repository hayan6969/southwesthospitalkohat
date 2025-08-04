import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { toPakistanTime } from "@/utils/timezone";

interface TopMedicine {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export const useFilteredTopProducts = (selectedMonth?: string) => {
  return useQuery({
    queryKey: ['filtered-top-products', selectedMonth],
    queryFn: async (): Promise<TopMedicine[]> => {
      let dateFilter = {};
      
      if (selectedMonth) {
        const monthDate = new Date(selectedMonth + '-01');
        const startOfSelectedMonth = startOfMonth(monthDate);
        const endOfSelectedMonth = endOfMonth(monthDate);
        
        dateFilter = {
          created_at: {
            gte: startOfSelectedMonth.toISOString(),
            lte: endOfSelectedMonth.toISOString()
          }
        };
      }

      // Fetch invoices with items and medicine data
      const { data: invoices, error } = await supabase
        .from('pharmacy_invoices')
        .select(`
          id,
          created_at,
          final_amount,
          pharmacy_invoice_items(
            quantity, 
            unit_price, 
            total_price, 
            medicine_id, 
            medicines(purchase_price, selling_price, name)
          )
        `)
        .gte('final_amount', 0) // Only sales, not returns
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by month if selected
      const filteredInvoices = selectedMonth 
        ? invoices?.filter(inv => {
            const invDate = toPakistanTime(new Date(inv.created_at));
            const monthDate = new Date(selectedMonth + '-01');
            const startOfSelectedMonth = startOfMonth(monthDate);
            const endOfSelectedMonth = endOfMonth(monthDate);
            return invDate >= startOfSelectedMonth && invDate <= endOfSelectedMonth;
          })
        : invoices;

      // Flatten invoice items
      const allInvoiceItems: any[] = [];
      (filteredInvoices || []).forEach(invoice => {
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

      // Calculate top medicines
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

      return Array.from(medicinesSold.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};