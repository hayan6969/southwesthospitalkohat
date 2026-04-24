import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPakistanDate, formatInPakistanTime } from '@/utils/timezone';
import { applyPatientDiscount } from '@/utils/discountUtils';

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [doctorsResult, patientsResult, appointmentsResult, paidAppointments] = await Promise.all([
        supabase.from('doctors').select('id'),
        supabase.from('patients').select('id'),
        supabase.from('appointments').select('id'),
        supabase.from('appointments').select('consultation_fee_at_time').eq('status', 'completed').eq('payment_status', 'paid')
      ]);

      const totalRevenue = paidAppointments.data?.reduce((sum, a) => sum + (a.consultation_fee_at_time || 0), 0) || 0;

      return {
        totalDoctors: doctorsResult.data?.length || 0,
        totalPatients: patientsResult.data?.length || 0,
        totalAppointments: appointmentsResult.data?.length || 0,
        totalRevenue
      };
    }
  });
};

export const useUsers = () => {
  const queryClient = useQueryClient();
  
  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Invalidate and refetch the users query when profiles table changes
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all users without limit to ensure we get everyone
      let allUsers: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .range(start, start + batchSize - 1)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          allUsers = [...allUsers, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      return allUsers;
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
      
      // Get staff counts per department
      const { data: profiles } = await supabase
        .from('profiles')
        .select('department_id')
        .not('department_id', 'is', null);
      
      const staffCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.department_id) {
          staffCounts[p.department_id] = (staffCounts[p.department_id] || 0) + 1;
        }
      });
      
      return (data || []).map(dept => ({
        ...dept,
        staff_count: staffCounts[dept.id] || 0
      }));
    }
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // Get audit logs with profile data using a LEFT JOIN
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user_profile:profiles(id, first_name, last_name, email, role)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      return logs || [];
    }
  });
};

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      // Fetch all patients without limit to ensure we get everyone
      let allPatients: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .range(start, start + batchSize - 1)
          .order('id');

        if (error) throw error;
        
        if (data && data.length > 0) {
          allPatients = [...allPatients, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      return allPatients;
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
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // Real-time updates are handled by the global useRealTimeUpdates hook
  // Removed duplicate subscription to prevent conflicts

  return query;
};

export const useLabReports = () => {
  return useQuery({
    queryKey: ['lab-reports'],
    queryFn: async () => {
      console.log('🧪 Fetching all lab reports...');
      // Fetch all lab reports without limit to ensure we get everyone
      let allLabReports: any[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        console.log(`🧪 Fetching lab reports batch: ${start} to ${start + batchSize - 1}`);
        const { data, error } = await supabase
          .from('lab_reports')
          .select(`
            *,
            patient:patients(*),
            doctor:doctors(*, profiles(first_name, last_name))
          `)
          .range(start, start + batchSize - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('🧪 Error fetching lab reports:', error);
          throw error;
        }
        
        console.log(`🧪 Fetched ${data?.length || 0} lab reports in this batch`);
        
        if (data && data.length > 0) {
          allLabReports = [...allLabReports, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`🧪 Total lab reports fetched: ${allLabReports.length}`);
      return allLabReports;
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
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

// Hook for paginated medicines with search
export const usePaginatedMedicines = (page: number = 1, pageSize: number = 10, searchTerm: string = '') => {
  return useQuery({
    queryKey: ['medicines-paginated', page, pageSize, searchTerm],
    queryFn: async () => {
      console.log(`🔍 Fetching medicines page ${page} with search: "${searchTerm}"`);
      
      let query = supabase
        .from('medicines')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching paginated medicines:', error);
        throw error;
      }
      
      console.log(`✅ Page ${page} fetched: ${data?.length} records, Total: ${count}`);
      
      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }
  });
};

// Hook for paginated invoices with search
export const usePaginatedInvoices = (page: number = 1, pageSize: number = 20, searchTerm: string = '') => {
  return useQuery({
    queryKey: ['invoices-paginated-v2', page, pageSize, searchTerm], // Updated cache key to force refresh
    queryFn: async () => {
      console.log(`🔍 Fetching invoices page ${page} with search: "${searchTerm}"`);
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(*,profiles(first_name, last_name, phone, email))
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching paginated invoices:', error);
        throw error;
      }
      
      console.log(`✅ Page ${page} fetched: ${data?.length} records, Total: ${count}`);
      
      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }
  });
};

// Hook for paginated pharmacy invoices
export const usePaginatedPharmacyInvoices = (page: number = 1, pageSize: number = 20, searchTerm: string = '', filterDate?: Date) => {
  return useQuery({
    queryKey: ['pharmacy-invoices-paginated', page, pageSize, searchTerm, filterDate?.toDateString()],
    queryFn: async () => {
      console.log(`🔍 Fetching pharmacy invoices page ${page} with search: "${searchTerm}" and date: ${filterDate?.toDateString() || 'none'}`);
      
      let query = supabase
        .from('pharmacy_invoices')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      // Apply date filter if provided (server-side)
      if (filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching paginated pharmacy invoices:', error);
        throw error;
      }
      
      console.log(`✅ Pharmacy page ${page} fetched: ${data?.length} records, Total: ${count}`);
      
      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    }
  });
};

// Hook for all medicines (used for counts and quick searches)
export const useAllMedicines = () => {
  return useQuery({
    queryKey: ['medicines-all'],
    queryFn: async () => {
      console.log('🔍 Fetching ALL medicines from database...');
      
      const { data, error, count } = await supabase
        .from('medicines')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all medicines:', error);
        throw error;
      }
      
      console.log('✅ All medicines fetched successfully:', count, 'total records');
      
      return { data: data || [], count: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since this is heavy
  });
};

// Hook for searchable medicines (database-level search)
export const useSearchableMedicines = (searchTerm: string = '') => {
  return useQuery({
    queryKey: ['medicines-searchable', searchTerm],
    queryFn: async () => {
      console.log(`🔍 Searching medicines with term: "${searchTerm}"`);
      
      let query = supabase
        .from('medicines')
        .select('*')
        .order('name', { ascending: true }); // Order by name for better search experience

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error searching medicines:', error);
        throw error;
      }
      
      console.log(`✅ Search completed: ${data?.length} medicines found`);
      
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes for responsive search
  });
};

// Keep original useMedicines for backward compatibility, but limit to recent medicines
export const useMedicines = () => {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: async () => {
      console.log('🔍 Fetching recent medicines from database...');
      
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Reduced limit for performance

      if (error) {
        console.error('❌ Error fetching medicines:', error);
        throw error;
      }
      
      console.log('✅ Recent medicines fetched successfully:', data?.length, 'records');
      
      return data;
    }
  });
};

export const usePharmacyStats = () => {
  return useQuery({
    queryKey: ['pharmacy-stats'],
    queryFn: async () => {
      // Use count queries instead of fetching all data
      const [
        { count: totalMedicines },
        { count: totalInvoices },
        { data: lowStockMedicines },
        { data: expiredMedicines },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('medicines').select('*', { count: 'exact', head: true }),
        supabase.from('pharmacy_invoices').select('*', { count: 'exact', head: true }),
        supabase.from('medicines').select('id').lte('stock_quantity', 10),
        supabase.from('medicines').select('id').lt('expiry_date', getCurrentPakistanDate()),
        supabase.from('pharmacy_invoices').select('final_amount')
      ]);

      const totalRevenue = revenueData?.reduce((sum, invoice) => sum + invoice.final_amount, 0) || 0;

      return {
        totalMedicines: totalMedicines || 0,
        lowStock: lowStockMedicines?.length || 0,
        expired: expiredMedicines?.length || 0,
        totalInvoices: totalInvoices || 0,
        totalRevenue,
        lowStockCount: lowStockMedicines?.length || 0
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
        .order('expiry_date', { ascending: true })
        .limit(5000);

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
      // Fetch all invoices without limit but without heavy joins to prevent timeout
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
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
      // If offline, store in offline storage
      if (!navigator.onLine) {
        const { addOfflineOperation } = await import('@/utils/offlineStorage');
        
        const tempAppointmentId = `offline_appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempInvoiceId = `offline_invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store appointment operation
        const appointmentOperation = {
          type: 'appointment' as const,
          table: 'appointments',
          method: 'POST' as const,
          data: {
            ...appointmentData.appointment,
            id: tempAppointmentId,
            payment_status: 'paid',
            booking_type: 'counter',
            invoice_generated_at: new Date().toISOString(),
            created_offline: true
          }
        };
        
        // Store invoice operation
        const invoiceOperation = {
          type: 'invoice' as const,
          table: 'invoices',
          method: 'POST' as const,
          data: {
            id: tempInvoiceId,
            patient_id: appointmentData.appointment.patient_id,
            doctor_id: appointmentData.appointment.doctor_id,
            amount: appointmentData.consultationFee,
            description: `Consultation with Dr. ${appointmentData.doctorName} - Patient: ${appointmentData.patientNumber || 'N/A'}`,
            invoice_number: `INV-TEMP-${Date.now()}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            due_date: new Date().toISOString(),
            created_offline: true
          }
        };
        
        await addOfflineOperation({
          ...appointmentOperation,
          action: 'insert'
        });
        await addOfflineOperation({
          ...invoiceOperation,
          action: 'insert'
        });
        
        return {
          appointment: appointmentOperation.data,
          invoice: invoiceOperation.data
        };
      }

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

      // Create invoice with proper description including patient ID
      const { data: patientInfo } = await supabase
        .from('patients')
        .select('patient_number')
        .eq('id', appointmentData.appointment.patient_id)
        .single();

      // Get current user for created_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Apply patient discount for consultation
      const discountResult = await applyPatientDiscount(appointmentData.appointment.patient_id, appointmentData.consultationFee, 'consultation');

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          patient_id: appointmentData.appointment.patient_id,
          doctor_id: appointmentData.appointment.doctor_id,
          amount: discountResult.discountedAmount,
          description: `Consultation with Dr. ${appointmentData.doctorName} - Patient: ${patientInfo?.patient_number || 'N/A'}${discountResult.discountLabel ? ` (${discountResult.discountLabel}, Original: Rs. ${discountResult.originalAmount})` : ''}`,
          invoice_number: `INV-${Date.now()}`,
          status: 'paid',
          paid_at: new Date().toISOString(),
          created_by: currentUser?.id || null
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      return { appointment, invoice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['patient-discount-preview'] });
      queryClient.invalidateQueries({ queryKey: ['all-patient-discounts'] });
    },
  });
};

export const useCreateLabOrderWithInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (labOrderData: any) => {
      // If offline, store in offline storage
      if (!navigator.onLine) {
        const { addOfflineOperation } = await import('@/utils/offlineStorage');
        
        const tempInvoiceId = `offline_lab_invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store invoice operation for lab
        const invoiceOperation = {
          type: 'invoice' as const,
          table: 'invoices',
          method: 'POST' as const,
          data: {
            id: tempInvoiceId,
            patient_id: labOrderData.patient_id,
            amount: labOrderData.totalAmount,
            description: labOrderData.invoiceDescription,
            invoice_number: `LAB-TEMP-${Date.now()}`,
            status: 'paid',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            due_date: new Date().toISOString(),
            created_offline: true,
            created_by: labOrderData.created_by || null,
          }
        };
        
        // Store lab reports operations
        const labReportOperations = labOrderData.selectedTests.map((test: any) => ({
          type: 'lab_report' as const,
          table: 'lab_reports',
          method: 'POST' as const,
          data: {
            id: `offline_lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            patient_id: labOrderData.patient_id,
            doctor_id: labOrderData.doctor_id,
            external_doctor_name: labOrderData.external_doctor_name,
            test_name: test.name,
            test_id: test.id,
            price: test.price,
            invoice_id: tempInvoiceId,
            notes: labOrderData.notes,
            status: 'pending',
            created_offline: true
          }
        }));
        
        await addOfflineOperation({
          ...invoiceOperation,
          action: 'insert'
        });
        
        for (const labOp of labReportOperations) {
          await addOfflineOperation({
            ...labOp,
            action: 'insert'
          });
        }
        
        return {
          invoice: invoiceOperation.data,
          labReports: labReportOperations.map(op => op.data)
        };
      }

      // Apply patient discount for lab orders
      const labDiscount = await applyPatientDiscount(labOrderData.patient_id, labOrderData.totalAmount, 'lab');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const createdBy = labOrderData.created_by || currentUser?.id || null;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          patient_id: labOrderData.patient_id,
          amount: labDiscount.discountedAmount,
          description: `${labOrderData.invoiceDescription}${labDiscount.discountLabel ? ` (${labDiscount.discountLabel}, Original: Rs. ${labDiscount.originalAmount})` : ''}`,
          invoice_number: labOrderData.invoiceNumber,
          status: 'paid',
          paid_at: new Date().toISOString(),
          created_by: createdBy
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create lab reports
      const labReportsData = labOrderData.selectedTests.map((test: any) => ({
        patient_id: labOrderData.patient_id,
        doctor_id: labOrderData.doctor_id,
        external_doctor_name: labOrderData.external_doctor_name,
        test_name: test.name,
        test_id: test.id,
        price: test.price,
        invoice_id: invoice.id,
        notes: labOrderData.notes,
        status: 'pending'
      }));

      const { data: labReports, error: labReportsError } = await supabase
        .from('lab_reports')
        .insert(labReportsData)
        .select();

      if (labReportsError) throw labReportsError;

      return { invoice, labReports, discount: labDiscount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-reports'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['patient-discount-preview'] });
      queryClient.invalidateQueries({ queryKey: ['all-patient-discounts'] });
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
      province?: string;
      city?: string;
    }) => {
      // If offline, store in offline storage
      if (!navigator.onLine) {
        const tempPatientId = `offline_patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to offline storage for syncing later
        const { addOfflineOperation } = await import('@/utils/offlineStorage');
        
        const patientOperation = {
          type: 'create_patient_with_profile' as const,
          table: 'patients',
          method: 'POST' as const,
          data: {
            ...patientData,
            id: tempPatientId,
            patient_number: `P-TEMP-${Date.now()}`, // Temporary number
            created_offline: true
          }
        };
        
        await addOfflineOperation({
          ...patientOperation,
          action: 'insert'
        });
        
        // Cache patient data locally for immediate use
        const cachedPatients = localStorage.getItem('cached_patients');
        let patients = cachedPatients ? JSON.parse(cachedPatients) : [];
        
        const newPatient = {
          id: tempPatientId,
          patient_number: `P-TEMP-${Date.now()}`,
          cnic: patientData.cnic,
          profile: {
            id: tempPatientId,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            phone: patientData.phone,
            email: `${patientData.phone}@patient.local`
          },
          created_offline: true
        };
        
        patients.push(newPatient);
        localStorage.setItem('cached_patients', JSON.stringify(patients));
        
        // Show offline notification
        console.log('Patient registered offline - will sync when online');
        
        return {
          patient: newPatient,
          user: { id: tempPatientId }
        };
      }

      // Check for existing profile with same phone number (username should be unique)
      const email = `${patientData.phone}@patient.local`;
      
      // Try to check for duplicates, but don't block registration on network errors
      // Database constraints will catch actual duplicates during insertion
      try {
        // Check by phone number
        const { data: byPhone, error: phoneCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', patientData.phone)
          .maybeSingle();
        
        // Only throw if we successfully checked and found a duplicate
        if (byPhone) {
          console.log('Phone number already exists:', patientData.phone);
          throw new Error('DUPLICATE_PHONE');
        }

        // Check by email pattern
        const { data: byEmail, error: emailCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        // Only throw if we successfully checked and found a duplicate
        if (byEmail) {
          console.log('Email pattern already exists:', email);
          throw new Error('DUPLICATE_PHONE');
        }
      } catch (checkError: any) {
        // If it's a duplicate error, rethrow it
        if (checkError.message === 'DUPLICATE_PHONE') {
          throw checkError;
        }
        // For network errors or other issues, log and continue
        // Database constraints will catch any actual duplicates
        console.warn('Could not verify duplicate status, proceeding with registration:', checkError.message);
      }

      // Use the database function to create user without affecting current session
      console.log('Creating new patient with email:', email);

      try {
        // Use the create_user_account function to avoid session switching
        const { data: userId, error: userError } = await supabase.rpc('create_user_account', {
          p_email: email,
          p_password: patientData.cnic,
          p_first_name: patientData.first_name,
          p_last_name: patientData.last_name,
          p_role: 'patient'
        });

        if (userError) {
          console.error('User creation error:', userError);
          if (userError.message.includes('already exists') || userError.message.includes('duplicate')) {
            throw new Error('DUPLICATE_PHONE');
          }
          throw new Error(`USER_CREATION_FAILED: ${userError.message}`);
        }

        if (!userId) {
          throw new Error('USER_CREATION_FAILED: No user ID returned');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            role: 'patient',
            phone: patientData.phone,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          if (profileError.code === '23505' || profileError.message?.includes('duplicate')) {
            throw new Error('DUPLICATE_PHONE');
          }
          throw new Error(`PROFILE_CREATION_FAILED: ${profileError.message}`);
        }

        // Create patient record
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .insert({
            id: userId,
            cnic: patientData.cnic,
            province: patientData.province || null,
            city: patientData.city || null,
          })
          .select()
          .single();

        if (patientError) {
          console.error('Patient creation error:', patientError);
          if (patientError.code === '23505') { // Unique constraint violation
            throw new Error('DUPLICATE_PHONE');
          }
          throw new Error(`PATIENT_CREATION_FAILED: ${patientError.message}`);
        }

        // Fetch the complete patient data with profile to get patient_number
        const { data: fullPatient, error: fetchError } = await supabase
          .from('patients')
          .select('*, profiles:id(first_name, last_name, phone, email)')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching patient data:', fetchError);
        }

        // Profile will be created automatically by the trigger
        return { 
          patient: fullPatient || patient, 
          user: { id: userId },
          patientNumber: fullPatient?.patient_number,
          phone: patientData.phone
        };
        
      } catch (error: any) {
        console.error('Error in patient creation:', error);
        
        // Handle specific error types
        if (error.message.includes('DUPLICATE_PHONE')) {
          throw new Error('DUPLICATE_PHONE');
        }
        if (error.message.includes('USER_CREATION_FAILED')) {
          throw error;
        }
        if (error.message.includes('PROFILE_CREATION_FAILED')) {
          throw error;
        }
        if (error.message.includes('PATIENT_CREATION_FAILED')) {
          throw error;
        }
        
        // Handle database constraint errors
        if (error.code === '23505') {
          throw new Error('DUPLICATE_PHONE');
        }
        
        throw new Error(`REGISTRATION_FAILED: ${error.message}`);
      }
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

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
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

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useDepartmentStaff = (departmentId: string | null) => {
  return useQuery({
    queryKey: ['department-staff', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, phone')
        .eq('department_id', departmentId)
        .order('first_name');

      if (error) throw error;
      return data;
    },
    enabled: !!departmentId,
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...invoice, created_by: invoice.created_by || currentUser?.id || null }])
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

// Legacy useCreateLabReport hook removed - use useCreateLabOrderWithInvoice instead

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
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      // Use the safe delete function to remove user and all related data
      const { data, error } = await supabase.rpc('delete_user_safely', {
        user_uuid: userId
      });

      if (error) throw error;
      
      // Check if the deletion was successful
      if (!data) {
        throw new Error('Failed to delete user - operation returned false');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    // Audit logging must never block or retry — it should be best-effort
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: ['medicines-paginated'] });
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

export const useMarkAppointmentFree = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      // First get the appointment to find the associated invoice and doctor info
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('patient_id, invoice_generated_at, doctor_id, consultation_fee_at_time')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Find the invoice for this patient created around the same time
      if (appointment.invoice_generated_at) {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id')
          .eq('patient_id', appointment.patient_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invoice && !invoiceError) {
          // Update the invoice to 0 amount and mark as free
          const { error: updateInvoiceError } = await supabase
            .from('invoices')
            .update({ 
              amount: 0,
              description: 'Free consultation (marked by doctor)',
              status: 'paid'
            })
            .eq('id', invoice.id);

          if (updateInvoiceError) throw updateInvoiceError;
        }
      }

      // Mark the appointment as cleared for tracking
      const { error: clearError } = await supabase
        .from('appointments')
        .update({ cleared_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (clearError) throw clearError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-analytics'] });
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
