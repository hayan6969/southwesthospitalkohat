import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return {
    mutateAsync: async (params: CreateUserParams) => {
      const { first_name, last_name, email, phone, role, department_id } = params;

      console.log('Creating user...', params);

      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            first_name,
            last_name,
            email,
            phone,
            role,
            department_id,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }

      console.log('User created:', data);
      return data;
    },
    isPending: false, // Placeholder, replace with actual state if needed
  };
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
