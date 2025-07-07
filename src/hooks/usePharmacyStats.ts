
import { useQuery } from '@tanstack/react-query';
import { useMedicines, usePharmacyInvoices } from './usePharmacy';

export const usePharmacyStats = () => {
  const { data: medicines } = useMedicines();
  const { data: invoices } = usePharmacyInvoices();

  return useQuery({
    queryKey: ['pharmacy-stats', medicines, invoices],
    queryFn: () => {
      const totalMedicines = medicines?.length || 0;
      const lowStock = medicines?.filter(med => 
        med.stock_quantity <= (med.minimum_stock_level || 10)
      ).length || 0;
      const expired = medicines?.filter(med => 
        new Date(med.expiry_date) < new Date()
      ).length || 0;
      const totalRevenue = invoices?.reduce((sum, invoice) => 
        sum + invoice.final_amount, 0
      ) || 0;

      return {
        totalMedicines,
        lowStock,
        expired,
        totalRevenue
      };
    },
    enabled: !!medicines || !!invoices
  });
};
