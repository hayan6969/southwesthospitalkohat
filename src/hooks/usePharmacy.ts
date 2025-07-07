
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMedicines = () => {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });
};

export const usePharmacyStats = () => {
  return useQuery({
    queryKey: ['pharmacy-stats'],
    queryFn: async () => {
      const [medicinesResult, invoicesResult] = await Promise.all([
        supabase.from('medicines').select('*'),
        supabase.from('pharmacy_invoices').select('*')
      ]);

      const medicines = medicinesResult.data || [];
      const invoices = invoicesResult.data || [];

      return {
        totalMedicines: medicines.length,
        lowStock: medicines.filter(m => m.stock_quantity <= (m.minimum_stock_level || 10)).length,
        expired: medicines.filter(m => new Date(m.expiry_date) < new Date()).length,
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, invoice) => sum + invoice.final_amount, 0),
        lowStockCount: medicines.filter(m => m.stock_quantity <= (m.minimum_stock_level || 10)).length
      };
    }
  });
};

export const useExpiringMedicines = () => {
  return useQuery({
    queryKey: ['expiring-medicines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      const medicinesWithDaysLeft = data?.map(medicine => {
        const today = new Date();
        const expiryDate = new Date(medicine.expiry_date);
        const diffTime = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...medicine,
          daysLeft
        };
      }) || [];

      return medicinesWithDaysLeft.filter(med => med.daysLeft <= 90);
    }
  });
};

export const usePharmacyInvoices = () => {
  return useQuery({
    queryKey: ['pharmacy-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select(`
          *,
          pharmacy_invoice_items(
            *,
            medicine:medicines(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useCreateMedicine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (medicine: any) => {
      const { data, error } = await supabase
        .from('medicines')
        .insert([medicine])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-medicines'] });
    },
  });
};

export const useCreatePharmacyInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ invoice, items }: { invoice: any, items: any[] }) => {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('pharmacy_invoices')
        .insert([invoice])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invoiceData.id
      }));

      const { error: itemsError } = await supabase
        .from('pharmacy_invoice_items')
        .insert(itemsWithInvoiceId);

      if (itemsError) throw itemsError;

      // Update medicine stock quantities
      for (const item of items) {
        const { data: currentMedicine, error: fetchError } = await supabase
          .from('medicines')
          .select('stock_quantity')
          .eq('id', item.medicine_id)
          .single();

        if (fetchError) throw fetchError;

        const newQuantity = Math.max(0, currentMedicine.stock_quantity - item.quantity);

        const { error: updateError } = await supabase
          .from('medicines')
          .update({ stock_quantity: newQuantity })
          .eq('id', item.medicine_id);

        if (updateError) throw updateError;
      }

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
    },
  });
};

export const useUpdateMedicine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('medicines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-medicines'] });
    },
  });
};

export const useDeleteMedicine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medicines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-medicines'] });
    },
  });
};
