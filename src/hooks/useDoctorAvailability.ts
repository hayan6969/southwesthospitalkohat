import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function useDoctorAvailability(doctorId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["doctor-availability", doctorId, date],
    queryFn: async () => {
      if (!doctorId || !date) return null;

      // Check doctor_availability table
      const { data: availability } = await supabase
        .from('doctor_availability')
        .select('is_available')
        .eq('doctor_id', doctorId)
        .eq('availability_date', date)
        .single();

      // Check doctor_daily_status table
      const { data: dailyStatus } = await supabase
        .from('doctor_daily_status')
        .select('accepting_appointments')
        .eq('doctor_id', doctorId)
        .eq('status_date', date)
        .single();

      // If no explicit availability record exists, default to available (true)
      // If no daily status record exists, default to accepting appointments (true)
      const isAvailable = availability?.is_available !== false;
      const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

      return {
        isAvailable,
        isAcceptingAppointments,
        canBook: isAvailable && isAcceptingAppointments
      };
    },
    enabled: !!doctorId && !!date,
  });
}

export function useCheckDoctorAvailability() {
  const checkAvailability = async (doctorId: string, date: string) => {
    // Check doctor_availability table
    const { data: availability } = await supabase
      .from('doctor_availability')
      .select('is_available')
      .eq('doctor_id', doctorId)
      .eq('availability_date', date)
      .single();

    // Check doctor_daily_status table
    const { data: dailyStatus } = await supabase
      .from('doctor_daily_status')
      .select('accepting_appointments')
      .eq('doctor_id', doctorId)
      .eq('status_date', date)
      .single();

    // If no explicit availability record exists, default to available (true)
    // If no daily status record exists, default to accepting appointments (true)
    const isAvailable = availability?.is_available !== false;
    const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

    return {
      isAvailable,
      isAcceptingAppointments,
      canBook: isAvailable && isAcceptingAppointments
    };
  };

  return { checkAvailability };
}