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
        .select(`
          *,
          profiles(first_name, last_name, email, phone)
        `)
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
          doctor:doctors(*, profiles(first_name, last_name, email, phone))
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
          patient:patients(*),
          doctor:doctors(*, profiles(first_name, last_name))
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
          patient:patients(*),
          doctor:doctors(*, profiles(first_name, last_name))
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
          patient:patients(*,profiles(first_name, last_name, phone, email))
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
        .select('*')
        .or(`cnic.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,patient_number.ilike.%${searchTerm}%`)
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
      // Create appointment with paid status for staff bookings
      const appointmentWithPayment = {
        ...appointmentData.appointment,
        payment_status: 'paid',
        booking_type: 'counter',
        invoice_generated_at: new Date().toISOString()
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentWithPayment])
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
          status: 'paid', // Staff appointments are paid at counter
          paid_at: new Date().toISOString()
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
    mutationFn: async (patientData: {
      first_name: string;
      last_name: string;
      phone: string;
      cnic: string;
    }) => {
      // Check for existing patient with same CNIC
      const { data: existingPatientByCnic } = await supabase
        .from('patients')
        .select('id')
        .eq('cnic', patientData.cnic)
        .maybeSingle();

      if (existingPatientByCnic) {
        throw new Error('DUPLICATE_CNIC');
      }

      // Check for existing profile with same phone number
      const { data: existingProfileByPhone } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', patientData.phone)
        .maybeSingle();

      if (existingProfileByPhone) {
        throw new Error('DUPLICATE_PHONE');
      }

      // Create user account first with phone as email and CNIC as password
      const email = `${patientData.phone}@patient.local`;

      // Store current session and access token
      const { data: currentSession } = await supabase.auth.getSession();
      const originalAccessToken = currentSession?.session?.access_token;
      const originalRefreshToken = currentSession?.session?.refresh_token;
      
      // Create user account first with phone as email and CNIC as password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: patientData.cnic,
        options: {
          data: {
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            role: 'patient'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('DUPLICATE_PHONE');
        }
        throw authError;
      }
      if (!authData.user) throw new Error('Failed to create user account');

      const patientId = authData.user.id;
      
      // Create patient record
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          id: patientId,
          cnic: patientData.cnic,
        })
        .select()
        .single();

      if (patientError) {
        if (patientError.code === '23505') {
          throw new Error('DUPLICATE_CNIC');
        }
        throw patientError;
      }

      // Immediately sign out the new patient account
      await supabase.auth.signOut();
      
      // Restore the original session if it exists
      if (currentSession?.session && originalAccessToken && originalRefreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: originalAccessToken,
            refresh_token: originalRefreshToken
          });
        } catch (error) {
          console.error('Failed to restore original session:', error);
          // If session restoration fails, force a page reload to get clean state
          window.location.reload();
        }
      }

      // Profile will be created automatically by the trigger
      return { patient, user: authData.user };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient-names'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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

// Patient Documents
export const usePatientDocuments = (patientId?: string) => {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      const query = supabase
        .from('patient_documents')
        .select(`
          *,
          uploaded_by_profile:profiles!patient_documents_uploaded_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (patientId) {
        query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });
};

export const useUploadPatientDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      patientId, 
      documentLabel 
    }: { 
      file: File; 
      patientId: string; 
      documentLabel: string; 
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.data.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('patient-documents')
        .getPublicUrl(filePath);

      // Insert document record
      const { data, error } = await supabase
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          document_name: file.name,
          document_label: documentLabel,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.data.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    }
  });
};

export const useDeletePatientDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentId: string) => {
      // First get the document to find the file path
      const { data: document, error: fetchError } = await supabase
        .from('patient_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const filePath = document.file_url.split('/').slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    }
  });
};
