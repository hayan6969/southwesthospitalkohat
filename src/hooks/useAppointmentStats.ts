import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const useAppointmentStats = (filterMonth?: Date) => {
  return useQuery({
    queryKey: ['appointment-stats', filterMonth?.toISOString()],
    queryFn: async () => {
      // Get appointment counts by status, filtered by date range if specified
      // Remove Supabase's default 1000 row limit by setting a higher limit
      let query = supabase.from('appointments').select('status, created_at').limit(50000);
      
      // If a filter month is provided, filter by that month; otherwise get all appointments
      if (filterMonth) {
        const monthStart = startOfMonth(filterMonth);
        const monthEnd = endOfMonth(filterMonth);
        query = query.gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString());
      }
      
      const { data: allAppointments } = await query;

      if (!allAppointments) return null;

      // Calculate totals
      const totalAppointments = allAppointments.length;
      const completed = allAppointments.filter(apt => apt.status === 'completed').length;
      const cancelled = allAppointments.filter(apt => apt.status === 'cancelled').length;
      const rescheduled = allAppointments.filter(apt => apt.status === 'rescheduled').length;
      const scheduled = allAppointments.filter(apt => apt.status === 'scheduled').length;

      // Generate monthly data for the last 12 months or daily data for selected month
      const monthlyData = [];
      const currentDate = filterMonth || new Date();
      
      if (filterMonth) {
        // Generate daily data for the selected month
        const daysInMonth = endOfMonth(filterMonth).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dayDate = new Date(filterMonth.getFullYear(), filterMonth.getMonth(), day);
          const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
          const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));
          
          const dayAppointments = allAppointments.filter(apt => {
            const aptDate = new Date(apt.created_at);
            return aptDate >= dayStart && aptDate <= dayEnd;
          });

          const dayData = {
            month: format(dayDate, 'dd MMM'),
            completed: dayAppointments.filter(apt => apt.status === 'completed').length,
            ongoing: dayAppointments.filter(apt => apt.status === 'scheduled').length,
            rescheduled: dayAppointments.filter(apt => apt.status === 'rescheduled').length,
            cancelled: dayAppointments.filter(apt => apt.status === 'cancelled').length,
          };

          monthlyData.push(dayData);
        }
      } else {
        // Generate monthly data for the last 12 months
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};