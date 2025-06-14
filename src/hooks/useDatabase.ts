
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'staff' | 'admin';
  department_id?: string;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    users?: User;
  };
  doctor?: {
    id: string;
    specialization?: string;
    users?: User;
  };
};

export type MedicalRecord = {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  created_at: string;
  patient?: {
    id: string;
    users?: User;
  };
  doctor?: {
    id: string;
    specialization?: string;
    users?: User;
  };
};

export type Invoice = {
  id: string;
  patient_id: string;
  invoice_number: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  due_date?: string;
  description?: string;
  created_at: string;
  paid_at?: string;
  patient?: {
    id: string;
    users?: User;
  };
};

export type LabReport = {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  test_date: string;
  results?: string;
  status: 'pending' | 'completed' | 'reviewed';
  notes?: string;
  created_at: string;
  patient?: {
    id: string;
    users?: User;
  };
  doctor?: {
    id: string;
    specialization?: string;
    users?: User;
  };
};

export type Department = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  details?: string;
  created_at: string;
  user?: User;
};

// Appointments hooks
export const useAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients!appointments_patient_id_fkey(
            id,
            users!patients_id_fkey(first_name, last_name, email, phone)
          ),
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            users!doctors_id_fkey(first_name, last_name, email, phone)
          )
        `)
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
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
    }
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
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
    }
  });
};

// Medical Records hooks
export const useMedicalRecords = () => {
  return useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients!medical_records_patient_id_fkey(
            id,
            users!patients_id_fkey(first_name, last_name, email, phone)
          ),
          doctor:doctors!medical_records_doctor_id_fkey(
            id,
            specialization,
            users!doctors_id_fkey(first_name, last_name, email, phone)
          )
        `)
        .order('visit_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: Omit<MedicalRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    }
  });
};

// Invoices hooks
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          patient:patients!invoices_patient_id_fkey(
            id,
            users!patients_id_fkey(first_name, last_name, email, phone)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at'>) => {
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
    }
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
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
    }
  });
};

// Lab Reports hooks
export const useLabReports = () => {
  return useQuery({
    queryKey: ['lab_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select(`
          *,
          patient:patients!lab_reports_patient_id_fkey(
            id,
            users!patients_id_fkey(first_name, last_name, email, phone)
          ),
          doctor:doctors!lab_reports_doctor_id_fkey(
            id,
            specialization,
            users!doctors_id_fkey(first_name, last_name, email, phone)
          )
        `)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useUpdateLabReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LabReport> & { id: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['lab_reports'] });
    }
  });
};

// Users hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          departments(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
          users!doctors_id_fkey(*)
        `);
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateDoctor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (doctor: { user: Omit<User, 'id' | 'created_at' | 'updated_at'>; specialization?: string; license_number?: string; experience_years?: number }) => {
      // First create the user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ ...doctor.user, role: 'doctor' }])
        .select()
        .single();
      
      if (userError) throw userError;
      
      // Then create the doctor record
      const { data, error } = await supabase
        .from('doctors')
        .insert([{
          id: userData.id,
          specialization: doctor.specialization,
          license_number: doctor.license_number,
          experience_years: doctor.experience_years || 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
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
          users!patients_id_fkey(*)
        `);
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patient: { user: Omit<User, 'id' | 'created_at' | 'updated_at'>; date_of_birth?: string; address?: string; blood_type?: string; allergies?: string }) => {
      // First create the user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ ...patient.user, role: 'patient' }])
        .select()
        .single();
      
      if (userError) throw userError;
      
      // Then create the patient record
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          id: userData.id,
          date_of_birth: patient.date_of_birth,
          address: patient.address,
          blood_type: patient.blood_type,
          allergies: patient.allergies
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Departments hooks
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

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (department: Omit<Department, 'id' | 'created_at'>) => {
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
    }
  });
};

// Audit Logs hooks
export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

// Stats hooks
export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [appointmentsRes, patientsRes, doctorsRes, invoicesRes] = await Promise.all([
        supabase.from('appointments').select('*'),
        supabase.from('patients').select('*'),
        supabase.from('doctors').select('*'),
        supabase.from('invoices').select('*')
      ]);

      return {
        totalAppointments: appointmentsRes.data?.length || 0,
        totalPatients: patientsRes.data?.length || 0,
        totalDoctors: doctorsRes.data?.length || 0,
        pendingInvoices: invoicesRes.data?.filter(inv => inv.status === 'pending').length || 0,
        totalRevenue: invoicesRes.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
      };
    }
  });
};
