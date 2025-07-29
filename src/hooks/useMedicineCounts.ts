import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMedicineCounts = () => {
  return useQuery({
    queryKey: ['medicine-counts'],
    queryFn: async () => {
      console.log('🔍 Fetching medicine counts directly from Supabase...');
      
      const [
        { count: totalMedicines },
        lowStockResponse,
        { data: outOfStockMedicines },
        normalStockResponse
      ] = await Promise.all([
        // Get total count
        supabase.from('medicines').select('*', { count: 'exact', head: true }),
        
        // Get low stock medicines (using proper filtering)
        supabase.from('medicines')
          .select('id, stock_quantity, minimum_stock_level')
          .or('stock_quantity.eq.0,stock_quantity.lte.10'),
        
        // Get out of stock medicines
        supabase.from('medicines')
          .select('id')
          .eq('stock_quantity', 0),
          
        // Get normal stock medicines  
        supabase.from('medicines')
          .select('id, stock_quantity, minimum_stock_level')
          .gt('stock_quantity', 10)
      ]);

      // Filter low stock medicines properly in JavaScript
      const lowStockMedicines = lowStockResponse.data?.filter(medicine => {
        if (medicine.stock_quantity === 0) return true; // Out of stock
        const minLevel = medicine.minimum_stock_level || 10;
        return medicine.stock_quantity <= minLevel;
      }) || [];

      // Filter normal stock medicines properly in JavaScript
      const normalStockMedicines = normalStockResponse.data?.filter(medicine => {
        const minLevel = medicine.minimum_stock_level || 10;
        return medicine.stock_quantity > minLevel;
      }) || [];

      const counts = {
        total: totalMedicines || 0,
        lowStock: lowStockMedicines.length,
        outOfStock: outOfStockMedicines?.length || 0,
        normalStock: normalStockMedicines.length
      };

      console.log('📊 Medicine counts fetched:', counts);
      
      return counts;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};