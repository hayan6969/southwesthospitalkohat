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

      // Get today's data
      const [
        todayDoctorsResult,
        todayPatientsResult,
        todayAppointmentsResult,
        todayInvoicesResult,
        yesterdayDoctorsResult,
        yesterdayPatientsResult,
        yesterdayAppointmentsResult,
        yesterdayInvoicesResult
      ] = await Promise.all([
        // Today's data
        supabase.from('doctors').select('id').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('patients').select('id').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('appointments').select('id').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        supabase.from('invoices').select('amount').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
        // Yesterday's data
        supabase.from('doctors').select('id').gte('created_at', yesterdayStart.toISOString()).lte('created_at', yesterdayEnd.toISOString()),
        supabase.from('patients').select('id').gte('created_at', yesterdayStart.toISOString()).lte('created_at', yesterdayEnd.toISOString()),
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
      const todayDoctorsCount = todayDoctorsResult.data?.length || 0;
      const todayPatientsCount = todayPatientsResult.data?.length || 0;
      const todayAppointmentsCount = todayAppointmentsResult.data?.length || 0;
      const todayRevenue = todayInvoicesResult.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

      const yesterdayDoctorsCount = yesterdayDoctorsResult.data?.length || 0;
      const yesterdayPatientsCount = yesterdayPatientsResult.data?.length || 0;
      const yesterdayAppointmentsCount = yesterdayAppointmentsResult.data?.length || 0;
      const yesterdayRevenue = yesterdayInvoicesResult.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

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

      // Generate trend data for the last 5 days
      const generateTrendData = async (table: 'doctors' | 'patients' | 'appointments' | 'invoices', valueField: string = 'id') => {
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

      const [doctorsTrend, patientsTrend, appointmentsTrend, revenueTrend] = await Promise.all([
        generateTrendData('doctors'),
        generateTrendData('patients'),
        generateTrendData('appointments'),
        generateTrendData('invoices', 'amount')
      ]);

      return {
        totalDoctors: totalDoctors.count || 0,
        totalPatients: totalPatients.count || 0,
        totalAppointments: totalAppointments.count || 0,
        totalRevenue,
        doctorsChange: calculateChange(todayDoctorsCount, yesterdayDoctorsCount),
        doctorsChangeType: calculateChangeType(todayDoctorsCount, yesterdayDoctorsCount),
        patientsChange: calculateChange(todayPatientsCount, yesterdayPatientsCount),
        patientsChangeType: calculateChangeType(todayPatientsCount, yesterdayPatientsCount),
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