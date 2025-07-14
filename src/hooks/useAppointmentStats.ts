import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const useAppointmentStats = () => {
  return useQuery({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      // Get total appointment counts by status
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('status, created_at');

      if (!allAppointments) return null;

      // Calculate totals
      const totalAppointments = allAppointments.length;
      const completed = allAppointments.filter(apt => apt.status === 'completed').length;
      const cancelled = allAppointments.filter(apt => apt.status === 'cancelled').length;
      const rescheduled = allAppointments.filter(apt => apt.status === 'rescheduled').length;
      const scheduled = allAppointments.filter(apt => apt.status === 'scheduled').length;

      // Generate monthly data for the last 12 months
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(currentDate, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthAppointments = allAppointments.filter(apt => {
          const aptDate = new Date(apt.created_at);
          return aptDate >= monthStart && aptDate <= monthEnd;
        });

        const monthData = {
          month: format(monthDate, 'MMM'),
          completed: monthAppointments.filter(apt => apt.status === 'completed').length,
          ongoing: monthAppointments.filter(apt => apt.status === 'scheduled').length,
          rescheduled: monthAppointments.filter(apt => apt.status === 'rescheduled').length,
          cancelled: monthAppointments.filter(apt => apt.status === 'cancelled').length,
        };

        monthlyData.push(monthData);
      }

      return {
        totals: {
          all: totalAppointments,
          completed,
          cancelled,
          rescheduled,
          scheduled
        },
        monthlyData
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000,
  });
};