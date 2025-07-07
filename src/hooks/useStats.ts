
import { useQuery } from '@tanstack/react-query';
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
