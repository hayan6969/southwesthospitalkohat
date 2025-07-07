
import { useCreateAuditLog } from '@/hooks/useAuditLogs';

export const useAuditLogger = () => {
  const createAuditLog = useCreateAuditLog();

  const logAction = async (action: string, details?: string) => {
    try {
      await createAuditLog.mutateAsync({
        action,
        details,
        ip_address: null
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  const logLogin = async (userId: string, email: string) => {
    await logAction('Login', `User ${email} logged in`);
  };

  const logLogout = async (userId: string, email: string) => {
    await logAction('Logout', `User ${email} logged out`);
  };

  const logCreate = async (type: string, details: string, userId?: string) => {
    await logAction(`Create ${type}`, details);
  };

  return { logAction, logLogin, logLogout, logCreate };
};
