
import { useCreateAuditLog } from "./useDatabase";

const getUserIP = async (): Promise<string> => {
  try {
    // Try multiple IP detection services for better reliability
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'https://api.my-ip.io/ip.json'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, { timeout: 5000 } as any);
        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats
          const ip = data.ip || data.origin || data.query;
          if (ip && typeof ip === 'string') {
            return ip;
          }
        }
      } catch (serviceError) {
        console.warn(`Failed to get IP from ${service}:`, serviceError);
        continue;
      }
    }

    // Fallback: try to get IP from browser's network info (limited)
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      console.log('Using fallback IP detection method');
      return 'Client-side';
    }

    return 'Unknown';
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
      console.log(`Audit log: ${action}`, details, `User: ${userId}, IP: ${ipAddress}`);
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  // Specific logging methods for important actions only
  const logLogin = (userId: string, userEmail: string) => 
    logAction('User Login', `User ${userEmail} logged in`, userId);

  const logLogout = (userId: string, userEmail: string) => 
    logAction('User Logout', `User ${userEmail} logged out`, userId);

  const logCreate = (entity: string, details: string, userId?: string) => 
    logAction(`Create ${entity}`, details, userId);

  const logUpdate = (entity: string, details: string, userId?: string) => 
    logAction(`Update ${entity}`, details, userId);

  const logDelete = (entity: string, details: string, userId?: string) => 
    logAction(`Delete ${entity}`, details, userId);

  const logDownload = (entity: string, details: string, userId?: string) => 
    logAction(`Download ${entity}`, details, userId);

  const logPrint = (entity: string, details: string, userId?: string) => 
    logAction(`Print ${entity}`, details, userId);

  const logSearch = (searchTerm: string, results: number, userId?: string) => 
    logAction('Search', `Searched for "${searchTerm}" - ${results} results found`, userId);

  const logError = (error: string, details?: string, userId?: string) => 
    logAction('Error', `${error}${details ? ` - ${details}` : ''}`, userId);

  const logStatusChange = (entity: string, details: string, userId?: string) => 
    logAction(`Status Change ${entity}`, details, userId);

  const logPayment = (details: string, userId?: string) => 
    logAction('Payment Processed', details, userId);

  return { 
    logAction,
    logLogin,
    logLogout,
    logCreate,
    logUpdate,
    logDelete,
    logDownload,
    logPrint,
    logSearch,
    logError,
    logStatusChange,
    logPayment
  };
};
