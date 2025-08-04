import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { toPakistanTime } from "@/utils/timezone";

interface MedicineWithSales {
  id: string;
  name: string;
  stock_quantity: number;
  quantity_sold: number;
  revenue: number;
  profit: number;
}

export const useAllMedicinesWithSales = (selectedMonth?: string, searchQuery?: string) => {
  return useQuery({
    queryKey: ['all-medicines-with-sales', selectedMonth, searchQuery],
    queryFn: async (): Promise<MedicineWithSales[]> => {
      // First, get all medicines
      const { data: medicines, error: medicinesError } = await supabase
        .from('medicines')
        .select('id, name, stock_quantity, purchase_price, selling_price')
        .order('name');

      if (medicinesError) throw medicinesError;

      // Then get sales data
      const { data: invoices, error: invoicesError } = await supabase
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

      if (invoicesError) throw invoicesError;

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

      // Calculate sales data per medicine
      const medicinesSalesMap = new Map();
      allInvoiceItems
        .filter(item => item.unit_price > 0) // Only sales, not returns
        .forEach(item => {
          const medicineId = item.medicine_id;
          const current = medicinesSalesMap.get(medicineId) || { 
            quantity_sold: 0, 
            revenue: 0, 
            profit: 0 
          };
          
          const profit = (item.unit_price - (item.medicines?.purchase_price || 0)) * item.quantity;
          
          medicinesSalesMap.set(medicineId, {
            quantity_sold: current.quantity_sold + item.quantity,
            revenue: current.revenue + item.total_price,
            profit: current.profit + profit
          });
        });

      // Combine medicines with sales data
      const result = medicines?.map(medicine => {
        const salesData = medicinesSalesMap.get(medicine.id) || {
          quantity_sold: 0,
          revenue: 0,
          profit: 0
        };

        return {
          id: medicine.id,
          name: medicine.name,
          stock_quantity: medicine.stock_quantity,
          quantity_sold: salesData.quantity_sold,
          revenue: salesData.revenue,
          profit: salesData.profit
        };
      }) || [];

      // Filter by search query if provided
      let filteredResult = result;
      if (searchQuery && searchQuery.trim() !== '') {
        filteredResult = result.filter(medicine =>
          medicine.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sort by quantity sold (descending), then by revenue
      return filteredResult.sort((a, b) => {
        if (b.quantity_sold !== a.quantity_sold) {
          return b.quantity_sold - a.quantity_sold;
        }
        return b.revenue - a.revenue;
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};