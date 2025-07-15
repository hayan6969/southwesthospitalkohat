import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export const useRealStatsData = () => {
  return useQuery({
    queryKey: ['real-stats-data'],
    queryFn: async () => {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);

      // Get today's and yesterday's data for appointments and invoices only
      // (doctors and patients don't have created_at columns)
      const [
        todayAppointmentsResult,
        todayInvoicesResult,
        yesterdayAppointmentsResult,
        yesterdayInvoicesResult
      ] = await Promise.all([
        // Today's data
        supabase.from('appointments').select('id').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('invoices').select('amount').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        // Yesterday's data
        supabase.from('appointments').select('id').gte('created_at', yesterdayStart.toISOString()).lte('created_at', yesterdayEnd.toISOString()),
        supabase.from('invoices').select('amount').gte('created_at', yesterdayStart.toISOString()).lte('created_at', yesterdayEnd.toISOString())
      ]);

      // Get total counts
      const [totalDoctors, totalPatients, totalAppointments, totalInvoices] = await Promise.all([
        supabase.from('doctors').select('id', { count: 'exact' }),
        supabase.from('patients').select('id', { count: 'exact' }),
        supabase.from('appointments').select('id', { count: 'exact' }),
        supabase.from('invoices').select('amount')
      ]);

      // Calculate totals
      const todayAppointmentsCount = todayAppointmentsResult.data?.length || 0;
      const todayRevenue = todayInvoicesResult.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

      const yesterdayAppointmentsCount = yesterdayAppointmentsResult.data?.length || 0;
      const yesterdayRevenue = yesterdayInvoicesResult.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

      // Only include hospital invoices (not OT doctor expenses) in total revenue
      const totalRevenue = totalInvoices.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

      // Calculate percentage changes
      const calculateChange = (today: number, yesterday: number) => {
        if (yesterday === 0) return today > 0 ? '+100%' : '0%';
        const change = ((today - yesterday) / yesterday) * 100;
        return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
      };

      const calculateChangeType = (today: number, yesterday: number): 'positive' | 'negative' => {
        return today >= yesterday ? 'positive' : 'negative';
      };

      // Generate trend data for the last 5 days (only for tables with created_at)
      const generateTrendData = async (table: 'appointments' | 'invoices', valueField: string = 'id') => {
        const data = [];
        for (let i = 4; i >= 0; i--) {
          const date = subDays(today, i);
          const start = startOfDay(date);
          const end = endOfDay(date);
          
          if (valueField === 'amount' && table === 'invoices') {
            const { data: dayData } = await supabase
              .from(table)
              .select('amount')
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString());
            
            const value = dayData?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
            data.push({ value });
          } else {
            const { data: dayData } = await supabase
              .from(table)
              .select('id')
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString());
            
            data.push({ value: dayData?.length || 0 });
          }
        }
        return data;
      };

      // Generate static trend data for doctors and patients (no created_at columns)
      const generateStaticTrendData = (totalCount: number) => {
        return Array(5).fill({ value: Math.floor(totalCount / 5) });
      };

      const [appointmentsTrend, revenueTrend] = await Promise.all([
        generateTrendData('appointments'),
        generateTrendData('invoices', 'amount')
      ]);

      // Generate static trends for doctors and patients
      const doctorsTrend = generateStaticTrendData(totalDoctors.count || 0);
      const patientsTrend = generateStaticTrendData(totalPatients.count || 0);

      return {
        totalDoctors: totalDoctors.count || 0,
        totalPatients: totalPatients.count || 0,
        totalAppointments: totalAppointments.count || 0,
        totalRevenue,
        doctorsChange: '0%', // No created_at data available
        doctorsChangeType: 'positive' as const,
        patientsChange: '0%', // No created_at data available  
        patientsChangeType: 'positive' as const,
        appointmentsChange: calculateChange(todayAppointmentsCount, yesterdayAppointmentsCount),
        appointmentsChangeType: calculateChangeType(todayAppointmentsCount, yesterdayAppointmentsCount),
        revenueChange: calculateChange(todayRevenue, yesterdayRevenue),
        revenueChangeType: calculateChangeType(todayRevenue, yesterdayRevenue),
        chartData: {
          doctors: doctorsTrend,
          patients: patientsTrend,
          appointments: appointmentsTrend,
          revenue: revenueTrend
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};