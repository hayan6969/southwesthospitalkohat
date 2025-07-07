
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching departments:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Users fetched:', data?.length);
      return data || [];
    },
  });
};

type CreateUserParams = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department_id?: string;
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateUserParams) => {
      console.log('Creating user...', params);

      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.email,
        password: 'TempPassword123!', // Temporary password - admin will set real one
        options: {
          data: {
            first_name: params.first_name,
            last_name: params.last_name,
            role: params.role
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      // The profile should be created automatically by the trigger
      // But let's manually create it to ensure it exists
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            first_name: params.first_name,
            last_name: params.last_name,
            email: params.email,
            phone: params.phone || null,
            role: params.role,
            department_id: params.department_id || null,
          })
          .select();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw profileError;
        }

        console.log('User created:', profileData);
        return profileData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          profiles(*)
        `);

      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }

      return data?.map(patient => ({
        ...patient,
        users: patient.profiles // Map profiles to users for compatibility
      })) || [];
    },
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
          profiles(*)
        `);

      if (error) {
        console.error('Error fetching doctors:', error);
        throw error;
      }

      return data?.map(doctor => ({
        ...doctor,
        users: doctor.profiles // Map profiles to users for compatibility
      })) || [];
    },
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
          patient:patients(
            *,
            profiles(*)
          ),
          doctor:doctors(
            *,
            profiles(*)
          )
        `)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      return data?.map(appointment => ({
        ...appointment,
        patient: appointment.patient ? {
          ...appointment.patient,
          users: appointment.patient.profiles
        } : null,
        doctor: appointment.doctor ? {
          ...appointment.doctor,
          users: appointment.doctor.profiles
        } : null
      })) || [];
    },
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
            profiles(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      return data?.map(invoice => ({
        ...invoice,
        patient: invoice.patient ? {
          ...invoice.patient,
          users: invoice.patient.profiles
        } : null
      })) || [];
    },
  });
};

export const useLabReports = () => {
  return useQuery({
    queryKey: ['lab_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          *,
          patient:patients(
            *,
            profiles(*)
          ),
          doctor:doctors(
            *,
            profiles(*)
          )
        `)
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Error fetching lab reports:', error);
        throw error;
      }

      return data?.map(report => ({
        ...report,
        patient: report.patient ? {
          ...report.patient,
          users: report.patient.profiles
        } : null,
        doctor: report.doctor ? {
          ...report.doctor,
          users: report.doctor.profiles
        } : null
      })) || [];
    },
  });
};

export const useMedicalRecords = () => {
  return useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients(
            *,
            profiles(*)
          ),
          doctor:doctors(
            *,
            profiles(*)
          )
        `)
        .order('visit_date', { ascending: false });

      if (error) {
        console.error('Error fetching medical records:', error);
        throw error;
      }

      return data?.map(record => ({
        ...record,
        patient: record.patient ? {
          ...record.patient,
          users: record.patient.profiles
        } : null,
        doctor: record.doctor ? {
          ...record.doctor,
          users: record.doctor.profiles
        } : null
      })) || [];
    },
  });
};

export const useMedicines = () => {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching medicines:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const usePharmacyInvoices = () => {
  return useQuery({
    queryKey: ['pharmacy_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pharmacy invoices:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const useExpiringMedicines = () => {
  return useQuery({
    queryKey: ['expiring_medicines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching expiring medicines:', error);
        throw error;
      }

      // Add days left calculation
      const medicinesWithDaysLeft = data?.map(medicine => ({
        ...medicine,
        daysLeft: Math.floor((new Date(medicine.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      return medicinesWithDaysLeft;
    },
  });
};

export const usePharmacyStats = () => {
  return useQuery({
    queryKey: ['pharmacy_stats'],
    queryFn: async () => {
      try {
        // Get total medicines
        const { data: medicinesData, error: medicinesError } = await supabase
          .from('medicines')
          .select('*');

        if (medicinesError) throw medicinesError;

        // Get total pharmacy invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('pharmacy_invoices')
          .select('*');

        if (invoicesError) throw invoicesError;

        // Calculate total revenue
        const totalRevenue = invoicesData?.reduce((sum, invoice) => sum + Number(invoice.final_amount || 0), 0) || 0;

        // Count low stock medicines
        const lowStockCount = medicinesData?.filter(med => med.stock_quantity <= (med.minimum_stock_level || 10)).length || 0;

        return {
          totalMedicines: medicinesData?.length || 0,
          totalInvoices: invoicesData?.length || 0,
          totalRevenue,
          lowStockCount
        };
      } catch (error) {
        console.error('Error fetching pharmacy stats:', error);
        return {
          totalMedicines: 0,
          totalInvoices: 0,
          totalRevenue: 0,
          lowStockCount: 0
        };
      }
    },
  });
};

// Create/Update/Delete mutations
export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert(params)
        .select();

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
    mutationFn: async (params: { 
      user: CreateUserParams;
      specialization: string;
      license_number?: string;
      experience_years?: number;
    }) => {
      // First create auth user and profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.user.email,
        password: 'TempPassword123!',
        options: {
          data: {
            first_name: params.user.first_name,
            last_name: params.user.last_name,
            role: params.user.role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            first_name: params.user.first_name,
            last_name: params.user.last_name,
            email: params.user.email,
            phone: params.user.phone || null,
            role: params.user.role,
            department_id: params.user.department_id || null,
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Then create the doctor record
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .insert({
            id: authData.user.id,
            specialization: params.specialization,
            license_number: params.license_number || null,
            experience_years: params.experience_years || 0,
          })
          .select();

        if (doctorError) throw doctorError;
        return doctorData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      user: CreateUserParams;
      date_of_birth?: string;
      address?: string;
      blood_type?: string;
      allergies?: string;
    }) => {
      // First create auth user and profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: params.user.email,
        password: 'TempPassword123!',
        options: {
          data: {
            first_name: params.user.first_name,
            last_name: params.user.last_name,
            role: params.user.role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            first_name: params.user.first_name,
            last_name: params.user.last_name,
            email: params.user.email,
            phone: params.user.phone || null,
            role: params.user.role,
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Then create the patient record
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .insert({
            id: authData.user.id,
            date_of_birth: params.date_of_birth || null,
            address: params.address || null,
            blood_type: params.blood_type || null,
            allergies: params.allergies || null,
          })
          .select();

        if (patientError) throw patientError;
        return patientData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      patient_id: string;
      doctor_id: string;
      appointment_date: string;
      type: string;
      notes?: string;
      status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...params,
          status: params.status || 'scheduled'
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      patient_id: string;
      invoice_number: string;
      amount: number;
      description?: string;
      due_date?: string;
      status?: 'paid' | 'pending' | 'overdue';
    }) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...params,
          status: params.status || 'pending'
        })
        .select();

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
    mutationFn: async (params: {
      patient_id: string;
      doctor_id: string;
      test_name: string;
      test_date?: string;
      status?: 'pending' | 'completed' | 'reviewed';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('lab_reports')
        .insert({
          ...params,
          status: params.status || 'pending'
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_reports'] });
    },
  });
};

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      patient_id: string;
      doctor_id: string;
      diagnosis?: string;
      treatment?: string;
      prescription?: string;
      notes?: string;
      visit_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert(params)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    },
  });
};

export const useCreateMedicine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      name: string;
      formula?: string;
      company_name?: string;
      batch_number?: string;
      manufacturing_date?: string;
      expiry_date: string;
      purchase_price: number;
      selling_price: number;
      stock_quantity: number;
      minimum_stock_level?: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('medicines')
        .insert(params)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
};

export const useCreatePharmacyInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      invoice_number: string;
      customer_name?: string;
      customer_phone?: string;
      total_amount: number;
      discount_amount?: number;
      final_amount: number;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .insert(params)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy_invoices'] });
    },
  });
};

export const useCreateAuditLog = () => {
  return useMutation({
    mutationFn: async (params: {
      user_id?: string;
      action: string;
      details?: string;
      ip_address?: string;
    }) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(params)
        .select();

      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { id: string; status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'; updated_at?: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(params)
        .eq('id', params.id)
        .select();

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
    mutationFn: async (params: { id: string; status?: 'paid' | 'pending' | 'overdue'; paid_at?: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(params)
        .eq('id', params.id)
        .select();

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
    mutationFn: async (params: { id: string; status?: 'pending' | 'completed' | 'reviewed'; results?: string }) => {
      const { data, error } = await supabase
        .from('lab_reports')
        .update(params)
        .eq('id', params.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_reports'] });
    },
  });
};

export const useUpdateMedicine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { id: string; [key: string]: any }) => {
      const { id, ...updateData } = params;
      const { data, error } = await supabase
        .from('medicines')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
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
    },
  });
};

type Stats = {
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
};

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats | null> => {
      try {
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'doctor');

        if (doctorsError) {
          console.error('Error fetching doctors:', doctorsError);
          throw doctorsError;
        }

        const { data: patientsData, error: patientsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');

        if (patientsError) {
          console.error('Error fetching patients:', patientsError);
          throw patientsError;
        }

        // Fetch appointments (replace 'appointments' with your actual table name)
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*');

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
          throw appointmentsError;
        }

        // Fetch revenue (replace 'invoices' with your actual table name and 'amount' with your revenue column)
        const { data: revenueData, error: revenueError } = await supabase
          .from('invoices')
          .select('amount');

        if (revenueError) {
          console.error('Error fetching revenue:', revenueError);
          throw revenueError;
        }

        const totalRevenue = revenueData?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

        const stats: Stats = {
          totalDoctors: doctorsData?.length || 0,
          totalPatients: patientsData?.length || 0,
          totalAppointments: appointmentsData?.length || 0,
          totalRevenue: totalRevenue,
        };

        return stats;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
      }
    },
  });
};
