import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      // Get recent audit logs for staff activity
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!auditLogs) return [];

      // Get user profiles to match with audit logs
      const userIds = [...new Set(auditLogs.map(log => log.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, department_id')
        .in('id', userIds);

      // Get departments for department names
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      const departmentMap = new Map(departments?.map(dept => [dept.id, dept.name]) || []);
      const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

      // Format activity data
      const recentActivity = auditLogs
        .filter(log => log.user_id && profileMap.has(log.user_id))
        .slice(0, 10)
        .map(log => {
          const profile = profileMap.get(log.user_id!);
          const departmentName = profile?.department_id 
            ? departmentMap.get(profile.department_id) || 'Unknown Department'
            : profile?.role === 'admin' ? 'Administration' 
            : profile?.role === 'doctor' ? 'Medical' 
            : profile?.role === 'pharmacy' ? 'Pharmacy'
            : profile?.role === 'finance' ? 'Finance'
            : 'General';

          return {
            staffMember: `${profile?.first_name || 'Unknown'} ${profile?.last_name || ''}`.trim(),
            department: departmentName,
            lastActivity: formatDistanceToNow(new Date(log.created_at || ''), { addSuffix: true }),
            action: log.action,
            details: log.details
          };
        });

      return recentActivity;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
};