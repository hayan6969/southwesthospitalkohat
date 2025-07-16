import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function useDoctorAvailability(doctorId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["doctor-availability", doctorId, date],
    queryFn: async () => {
      if (!doctorId || !date) return null;

      console.log('Checking availability for:', { doctorId, date });

      // Get day of week for the selected date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();

      // Check doctor working hours for this day of week
      const { data: workingHours, error: workingHoursError } = await supabase
        .from('doctor_working_hours')
        .select('is_working')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      console.log('Working hours query result:', { workingHours, workingHoursError, dayOfWeek });

      // If doctor has working hours set for this day and is_working is false, they're not available
      const isWorkingDay = workingHours?.is_working !== false; // Default true if no record

      // Check doctor_availability table (for specific date overrides)
      const { data: availability, error: availabilityError } = await supabase
        .from('doctor_availability')
        .select('is_available')
        .eq('doctor_id', doctorId)
        .eq('availability_date', date)
        .maybeSingle();

      console.log('Availability query result:', { availability, availabilityError });

      // Check doctor_daily_status table
      const { data: dailyStatus, error: dailyError } = await supabase
        .from('doctor_daily_status')
        .select('accepting_appointments')
        .eq('doctor_id', doctorId)
        .eq('status_date', date)
        .maybeSingle();

      console.log('Daily status query result:', { dailyStatus, dailyError });

      // Determine final availability:
      // 1. Must be a working day (from doctor_working_hours)
      // 2. Must be available (from doctor_availability, defaults to true)
      // 3. Must be accepting appointments (from doctor_daily_status, defaults to true)
      const isAvailable = isWorkingDay && (availability?.is_available !== false);
      const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

      const result = {
        isAvailable,
        isAcceptingAppointments,
        isWorkingDay,
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
    
    // Get day of week for the selected date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();

    // Check doctor working hours for this day of week
    const { data: workingHours, error: workingHoursError } = await supabase
      .from('doctor_working_hours')
      .select('is_working')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();

    console.log('Manual working hours query result:', { workingHours, workingHoursError, dayOfWeek });

    // If doctor has working hours set for this day and is_working is false, they're not available
    const isWorkingDay = workingHours?.is_working !== false; // Default true if no record

    // Check doctor_availability table (for specific date overrides)
    const { data: availability, error: availabilityError } = await supabase
      .from('doctor_availability')
      .select('is_available')
      .eq('doctor_id', doctorId)
      .eq('availability_date', date)
      .maybeSingle();

    console.log('Manual availability query result:', { availability, availabilityError });

    // Check doctor_daily_status table
    const { data: dailyStatus, error: dailyError } = await supabase
      .from('doctor_daily_status')
      .select('accepting_appointments')
      .eq('doctor_id', doctorId)
      .eq('status_date', date)
      .maybeSingle();

    console.log('Manual daily status query result:', { dailyStatus, dailyError });

    // Determine final availability:
    // 1. Must be a working day (from doctor_working_hours)
    // 2. Must be available (from doctor_availability, defaults to true)
    // 3. Must be accepting appointments (from doctor_daily_status, defaults to true)
    const isAvailable = isWorkingDay && (availability?.is_available !== false);
    const isAcceptingAppointments = dailyStatus?.accepting_appointments !== false;

    const result = {
      isAvailable,
      isAcceptingAppointments,
      isWorkingDay,
      canBook: isAvailable && isAcceptingAppointments
    };

    console.log('Manual availability final result:', result);
    return result;
  };

  return { checkAvailability };
}