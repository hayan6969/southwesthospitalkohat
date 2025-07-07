import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(startOfDay(date), 'yyyy-MM-dd');
      });

      // Get appointment trends
      const { data: appointments } = await supabase
        .from('appointments')
        .select('created_at, status')
        .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Get revenue data from invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, created_at, status')
        .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Get pharmacy revenue from pharmacy_invoices
      const { data: pharmacyInvoices } = await supabase
        .from('pharmacy_invoices')
        .select('final_amount, created_at')
        .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Get user registration trends
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at, role')
        .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Process appointment trends
      const appointmentTrends = last30Days.map(date => {
        const count = appointments?.filter(apt => 
          format(new Date(apt.created_at), 'yyyy-MM-dd') === date
        ).length || 0;
        return { date, appointments: count };
      });

      // Process revenue trends
      const revenueTrends = last30Days.map(date => {
        const hospitalRevenue = invoices?.filter(inv => 
          format(new Date(inv.created_at), 'yyyy-MM-dd') === date && inv.status === 'paid'
        ).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

        const pharmacyRevenue = pharmacyInvoices?.filter(inv => 
          format(new Date(inv.created_at), 'yyyy-MM-dd') === date
        ).reduce((sum, inv) => sum + Number(inv.final_amount), 0) || 0;

        return { 
          date, 
          hospital: hospitalRevenue,
          pharmacy: pharmacyRevenue,
          total: hospitalRevenue + pharmacyRevenue
        };
      });

      // Process user registration trends
      const userTrends = last30Days.map(date => {
        const dayUsers = users?.filter(user => 
          format(new Date(user.created_at), 'yyyy-MM-dd') === date
        ) || [];
        
        return {
          date,
          patients: dayUsers.filter(u => u.role === 'patient').length,
          doctors: dayUsers.filter(u => u.role === 'doctor').length,
          staff: dayUsers.filter(u => u.role === 'staff').length,
          total: dayUsers.length
        };
      });

      // Get department distribution
      const { data: departmentData } = await supabase
        .from('profiles')
        .select(`
          department_id,
          departments(name)
        `)
        .not('department_id', 'is', null);

      const departmentStats = departmentData?.reduce((acc, user) => {
        const deptName = user.departments?.name || 'Unassigned';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        appointmentTrends,
        revenueTrends,
        userTrends,
        departmentStats,
        totalRevenue: revenueTrends.reduce((sum, day) => sum + day.total, 0),
        totalAppointments: appointmentTrends.reduce((sum, day) => sum + day.appointments, 0),
        totalUsers: userTrends.reduce((sum, day) => sum + day.total, 0)
      };
    }
  });
};