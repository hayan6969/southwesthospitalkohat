import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export const usePopularDoctors = () => {
  return useQuery({
    queryKey: ['popular-doctors'],
    queryFn: async () => {
      // Get appointments from current month only for "Popular Doctors this month"
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      // Get appointments from current month with doctor data
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          doctor_id,
          status,
          created_at,
          doctors(
            specialization,
            profiles(first_name, last_name)
          )
        `)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (!appointments) return [];

      // Calculate statistics for each doctor
      const doctorStats = appointments.reduce((acc: any, appointment) => {
        const doctorId = appointment.doctor_id;
        
        if (!acc[doctorId]) {
          acc[doctorId] = {
            doctor_id: doctorId,
            total_appointments: 0,
            completed_appointments: 0,
            doctor_data: appointment.doctors
          };
        }
        
        acc[doctorId].total_appointments++;
        if (appointment.status === 'completed') {
          acc[doctorId].completed_appointments++;
        }
        
        return acc;
      }, {});

      // Calculate success rate and sort by popularity
      const doctorList = Object.values(doctorStats).map((doctor: any) => {
        const successRate = doctor.total_appointments > 0 
          ? Math.round((doctor.completed_appointments / doctor.total_appointments) * 100)
          : 0;
        
        return {
          id: doctor.doctor_id,
          name: `Dr. ${doctor.doctor_data?.profiles?.first_name || 'Unknown'} ${doctor.doctor_data?.profiles?.last_name || ''}`.trim(),
          specialization: doctor.doctor_data?.specialization || 'General Medicine',
          totalAppointments: doctor.total_appointments,
          completedAppointments: doctor.completed_appointments,
          successRate
        };
      });

      // Sort by total appointments (popularity) and then by success rate
      const sortedDoctors = doctorList
        .filter(doctor => doctor.totalAppointments > 0)
        .sort((a, b) => {
          if (a.totalAppointments === b.totalAppointments) {
            return b.successRate - a.successRate;
          }
          return b.totalAppointments - a.totalAppointments;
        })
        .slice(0, 5); // Top 5 doctors

      return sortedDoctors;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};