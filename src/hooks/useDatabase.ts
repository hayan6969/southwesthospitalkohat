import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [doctorsResult, patientsResult, appointmentsResult] = await Promise.all([
        supabase.from('doctors').select('id'),
        supabase.from('patients').select('id'),
        supabase.from('appointments').select('id')
      ]);

      return {
        totalDoctors: doctorsResult.data?.length || 0,
        totalPatients: patientsResult.data?.length || 0,
        totalAppointments: appointmentsResult.data?.length || 0,
        totalRevenue: 55240
      };
    }
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });
};

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('id');

      if (error) throw error;
      return data;
    }
  });
};

export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('id');

      if (error) throw error;
      return data;
    }
  });
};

export const useAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*),
          doctor:doctors(*)
        `)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useLabReports = () => {
  return useQuery({
    queryKey: ['lab-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          *,
          patient:patients(
            *,
            profiles!patients_id_fkey (*)
          ),
          doctor:doctors(
            *,
            profiles!doctors_id_fkey (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useMedicalRecords = () => {
  return useQuery({
    queryKey: ['medical-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients(
            *,
            profiles!patients_id_fkey (*)
          ),
          doctor:doctors(
            *,
            profiles!doctors_id_fkey (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(
            *,
            profiles!patients_id_fkey (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

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

      // Calculate days left for each medicine
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

      // Filter to show only medicines expiring within 90 days
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

export const useInvoiceItems = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await supabase
        .from('pharmacy_invoice_items')
        .select(`
          *,
          medicines(name)
        `)
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      return data?.map(item => ({
        ...item,
        medicine_name: item.medicines?.name || 'Unknown Medicine'
      })) || [];
    },
    enabled: !!invoiceId,
  });
};

// Search patients by CNIC or ID
export const useSearchPatients = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-patients', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          profiles!patients_id_fkey (*)
        `)
        .or(`cnic.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!searchTerm && searchTerm.length > 2,
  });
};

// Mutation hooks
export const useCreateAppointmentWithInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointmentData: any) => {
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData.appointment])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          patient_id: appointmentData.appointment.patient_id,
          amount: appointmentData.consultationFee,
          description: `Consultation with Dr. ${appointmentData.doctorName}`,
          invoice_number: `INV-${Date.now()}`,
          status: 'pending'
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      return { appointment, invoice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useCreatePatientWithProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patientData: any) => {
      // Create profile first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: patientData.id,
          email: patientData.email || `${patientData.phone}@temp.com`,
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          phone: patientData.phone,
          role: 'patient'
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      // Create patient record
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert([{
          id: profile.id,
          cnic: patientData.cnic,
          date_of_birth: patientData.date_of_birth,
          address: patientData.address,
          blood_type: patientData.blood_type,
          allergies: patientData.allergies
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      return { profile, patient };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Keep existing mutation hooks
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointment: any) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (department: any) => {
      const { data, error } = await supabase
        .from('departments')
        .insert([department])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useCreateDoctor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (doctor: any) => {
      const { data, error } = await supabase
        .from('doctors')
        .insert([doctor])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useCreateLabReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (labReport: any) => {
      const { data, error } = await supabase
        .from('lab_reports')
        .insert([labReport])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
    },
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patient: any) => {
      const { data, error } = await supabase
        .from('patients')
        .insert([patient])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (user: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert([user])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (auditLog: any) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([auditLog])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
};

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
    },
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
      // Create the invoice first
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('pharmacy_invoices')
        .insert([invoice])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create the invoice items
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
        // Get current stock first
        const { data: currentMedicine, error: fetchError } = await supabase
          .from('medicines')
          .select('stock_quantity')
          .eq('id', item.medicine_id)
          .single();

        if (fetchError) throw fetchError;

        const newStockQuantity = currentMedicine.stock_quantity - item.quantity;
        
        const { error: updateError } = await supabase
          .from('medicines')
          .update({ 
            stock_quantity: newStockQuantity
          })
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

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useUpdateLabReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('lab_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
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

export const useUpdateDoctor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useDeleteLabReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lab_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
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
