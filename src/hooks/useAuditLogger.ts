
import { useCreateAuditLog } from "./useDatabase";

const getUserIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return 'Unknown';
  }
};

export const useAuditLogger = () => {
  const createAuditLog = useCreateAuditLog();

  const logAction = async (action: string, details?: string, userId?: string) => {
    try {
      const ipAddress = await getUserIP();
      await createAuditLog.mutateAsync({
        user_id: userId,
        action,
        details,
        ip_address: ipAddress
      });
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  return { logAction };
};
