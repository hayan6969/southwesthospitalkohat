import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface UseRecentActivityOptions {
  enabled?: boolean;
}

export const useRecentActivity = (options?: UseRecentActivityOptions) => {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["recent-activity"],
    enabled,
    queryFn: async () => {
      const { data: auditLogs, error: auditLogsError } = await supabase
        .from("audit_logs")
        .select("id, user_id, created_at, action, details")
        .order("created_at", { ascending: false })
        .limit(20);

      if (auditLogsError) throw auditLogsError;
      if (!auditLogs?.length) return [];

      const userIds = [...new Set(auditLogs.map((log) => log.user_id).filter(Boolean))];
      if (!userIds.length) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, department_id")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const departmentIds = [
        ...new Set(profiles?.map((profile) => profile.department_id).filter(Boolean) || []),
      ];

      const departmentsResult = departmentIds.length
        ? await supabase.from("departments").select("id, name").in("id", departmentIds)
        : { data: [], error: null };

      if (departmentsResult.error) throw departmentsResult.error;

      const departmentMap = new Map(
        (departmentsResult.data || []).map((department) => [department.id, department.name])
      );
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

      return auditLogs
        .filter((log) => log.user_id && profileMap.has(log.user_id))
        .slice(0, 10)
        .map((log) => {
          const profile = profileMap.get(log.user_id!);
          const departmentName = profile?.department_id
            ? departmentMap.get(profile.department_id) || "Unknown Department"
            : profile?.role === "admin"
              ? "Administration"
              : profile?.role === "doctor"
                ? "Medical"
                : profile?.role === "pharmacy"
                  ? "Pharmacy"
                  : profile?.role === "finance"
                    ? "Finance"
                    : "General";

          return {
            staffMember: `${profile?.first_name || "Unknown"} ${profile?.last_name || ""}`.trim(),
            department: departmentName,
            lastActivity: formatDistanceToNow(new Date(log.created_at || ""), { addSuffix: true }),
            action: log.action,
            details: log.details,
          };
        });
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};
