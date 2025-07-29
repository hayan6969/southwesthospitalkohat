import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMedicineCounts = () => {
  return useQuery({
    queryKey: ['medicine-counts'],
    queryFn: async () => {
      console.log('🔍 Fetching medicine counts directly from Supabase...');
      
      const [
        { count: totalMedicines },
        { data: lowStockMedicines },
        { data: outOfStockMedicines },
        { data: normalStockMedicines }
      ] = await Promise.all([
        // Get total count
        supabase.from('medicines').select('*', { count: 'exact', head: true }),
        
        // Get low stock medicines (including out of stock)
        supabase.from('medicines')
          .select('id, stock_quantity, minimum_stock_level')
          .or('stock_quantity.eq.0,and(stock_quantity.lte.minimum_stock_level,minimum_stock_level.not.is.null),and(stock_quantity.lte.10,minimum_stock_level.is.null)'),
        
        // Get out of stock medicines
        supabase.from('medicines')
          .select('id')
          .eq('stock_quantity', 0),
          
        // Get normal stock medicines  
        supabase.from('medicines')
          .select('id, stock_quantity, minimum_stock_level')
          .or('and(stock_quantity.gt.minimum_stock_level,minimum_stock_level.not.is.null),and(stock_quantity.gt.10,minimum_stock_level.is.null)')
      ]);

      const counts = {
        total: totalMedicines || 0,
        lowStock: lowStockMedicines?.length || 0,
        outOfStock: outOfStockMedicines?.length || 0,
        normalStock: normalStockMedicines?.length || 0
      };

      console.log('📊 Medicine counts fetched:', counts);
      
      return counts;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
  });
};