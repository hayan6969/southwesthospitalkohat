import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function useDoctorAvailability(doctorId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["doctor-availability", doctorId, date],
    queryFn: async () => {
      if (!doctorId || !date) return null;

      console.log('Checking availability for:', { doctorId, date });

      // Check doctor_availability table
      const { data: availability, error: availabilityError } = await supabase
        .from('doctor_availability')
        .select('is_available')
        .eq('doctor_id', doctorId)
        .eq('availability_date', date)
        .single();

      console.log('Availability query result:', { availability, availabilityError });

      // Check doctor_daily_status table
      const { data: dailyStatus, error: dailyError } = await supabase
        .from('doctor_daily_status')
        .select('accepting_appointments')
        .eq('doctor_id', doctorId)
        .eq('status_date', date)
        .single();

      console.log('Daily status query result:', { dailyStatus, dailyError });

      // If no explicit availability record exists, default to available (true)
      // If no daily status record exists, default to accepting appointments (true)
      const isAvailable = availability?.is_available !== false;
      const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

      const result = {
        isAvailable,
        isAcceptingAppointments,
        canBook: isAvailable && isAcceptingAppointments
      };

      console.log('Final availability result:', result);
      return result;
    },
    enabled: !!doctorId && !!date,
  });
}

export function useCheckDoctorAvailability() {
  const checkAvailability = async (doctorId: string, date: string) => {
    console.log('Manual availability check for:', { doctorId, date });
    
    // Check doctor_availability table
    const { data: availability, error: availabilityError } = await supabase
      .from('doctor_availability')
      .select('is_available')
      .eq('doctor_id', doctorId)
      .eq('availability_date', date)
      .single();

    console.log('Manual availability query result:', { availability, availabilityError });

    // Check doctor_daily_status table
    const { data: dailyStatus, error: dailyError } = await supabase
      .from('doctor_daily_status')
      .select('accepting_appointments')
      .eq('doctor_id', doctorId)
      .eq('status_date', date)
      .single();

    console.log('Manual daily status query result:', { dailyStatus, dailyError });

    // If no explicit availability record exists, default to available (true)
    // If no daily status record exists, default to accepting appointments (true)
    const isAvailable = availability?.is_available !== false;
    const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

    const result = {
      isAvailable,
      isAcceptingAppointments,
      canBook: isAvailable && isAcceptingAppointments
    };

    console.log('Manual availability final result:', result);
    return result;
  };

  return { checkAvailability };
}