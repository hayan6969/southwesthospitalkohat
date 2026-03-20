import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface UseRealStatsDataOptions {
  enabled?: boolean;
}

export const useRealStatsData = (options?: UseRealStatsDataOptions) => {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["real-stats-data"],
    enabled,
    queryFn: async () => {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      const trendStart = startOfDay(subDays(today, 4));

      const [appointmentsWindow, totalDoctors, totalPatients, totalAppointments, allCompletedAppointments] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, created_at, consultation_fee_at_time, status, payment_status")
          .gte("created_at", trendStart.toISOString())
          .lte("created_at", todayEnd.toISOString()),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase
          .from("appointments")
          .select("consultation_fee_at_time")
          .eq("status", "completed")
          .eq("payment_status", "paid"),
      ]);

      const firstError = [
        appointmentsWindow.error,
        totalDoctors.error,
        totalPatients.error,
        totalAppointments.error,
        allCompletedAppointments.error,
      ].find(Boolean);

      if (firstError) throw firstError;

      const dayKeys = Array.from({ length: 5 }, (_, index) =>
        format(subDays(today, 4 - index), "yyyy-MM-dd")
      );
      const appointmentsByDay = new Map(dayKeys.map((key) => [key, 0]));
      const revenueByDay = new Map(dayKeys.map((key) => [key, 0]));

      let todayAppointmentsCount = 0;
      let yesterdayAppointmentsCount = 0;
      let todayRevenue = 0;
      let yesterdayRevenue = 0;

      appointmentsWindow.data?.forEach((appointment) => {
        if (!appointment.created_at) return;

        const createdAt = new Date(appointment.created_at);
        const dayKey = format(createdAt, "yyyy-MM-dd");
        if (!appointmentsByDay.has(dayKey)) return;

        appointmentsByDay.set(dayKey, (appointmentsByDay.get(dayKey) || 0) + 1);

        const paidRevenue =
          appointment.status === "completed" && appointment.payment_status === "paid"
            ? appointment.consultation_fee_at_time || 0
            : 0;

        revenueByDay.set(dayKey, (revenueByDay.get(dayKey) || 0) + paidRevenue);

        if (createdAt >= todayStart && createdAt <= todayEnd) {
          todayAppointmentsCount += 1;
          todayRevenue += paidRevenue;
        } else if (createdAt >= yesterdayStart && createdAt <= yesterdayEnd) {
          yesterdayAppointmentsCount += 1;
          yesterdayRevenue += paidRevenue;
        }
      });

      const totalRevenue =
        allCompletedAppointments.data?.reduce(
          (sum, appointment) => sum + (appointment.consultation_fee_at_time || 0),
          0
        ) || 0;

      const calculateChange = (currentValue: number, previousValue: number) => {
        if (previousValue === 0) return currentValue > 0 ? "+100%" : "0%";
        const change = ((currentValue - previousValue) / previousValue) * 100;
        return `${change >= 0 ? "+" : ""}${Math.round(change)}%`;
      };

      const calculateChangeType = (
        currentValue: number,
        previousValue: number
      ): "positive" | "negative" => {
        return currentValue >= previousValue ? "positive" : "negative";
      };

      const appointmentsTrend = dayKeys.map((key) => ({ value: appointmentsByDay.get(key) || 0 }));
      const revenueTrend = dayKeys.map((key) => ({ value: revenueByDay.get(key) || 0 }));
      const doctorsTrend = Array.from({ length: 5 }, () => ({ value: Math.floor((totalDoctors.count || 0) / 5) }));
      const patientsTrend = Array.from({ length: 5 }, () => ({ value: Math.floor((totalPatients.count || 0) / 5) }));

      return {
        totalDoctors: totalDoctors.count || 0,
        totalPatients: totalPatients.count || 0,
        totalAppointments: totalAppointments.count || 0,
        totalRevenue,
        doctorsChange: "0%",
        doctorsChangeType: "positive" as const,
        patientsChange: "0%",
        patientsChangeType: "positive" as const,
        appointmentsChange: calculateChange(todayAppointmentsCount, yesterdayAppointmentsCount),
        appointmentsChangeType: calculateChangeType(todayAppointmentsCount, yesterdayAppointmentsCount),
        revenueChange: calculateChange(todayRevenue, yesterdayRevenue),
        revenueChangeType: calculateChangeType(todayRevenue, yesterdayRevenue),
        chartData: {
          doctors: doctorsTrend,
          patients: patientsTrend,
          appointments: appointmentsTrend,
          revenue: revenueTrend,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
