
import { useCreateAuditLog } from "./useDatabase";

export const useAuditLogger = () => {
  const createAuditLog = useCreateAuditLog();

  const logAction = async (action: string, details?: string, userId?: string) => {
    try {
      await createAuditLog.mutateAsync({
        user_id: userId,
        action,
        details
      });
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  return { logAction };
};
