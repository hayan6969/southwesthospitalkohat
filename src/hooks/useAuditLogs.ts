
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (auditLog: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          ...auditLog,
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
};
