
import { useCreateAuditLog } from '@/hooks/useAuditLogs';

export const useAuditLogger = () => {
  const createAuditLog = useCreateAuditLog();

  const logAction = async (action: string, details?: string) => {
    try {
      await createAuditLog.mutateAsync({
        action,
        details,
        ip_address: null // Could be populated from client if needed
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};
