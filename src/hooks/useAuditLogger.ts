
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
      console.log(`Audit log: ${action}`, details);
    } catch (error) {
      console.error("Failed to log audit action:", error);
    }
  };

  // Specific logging methods for different actions
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

  const logView = (entity: string, details: string, userId?: string) => 
    logAction(`View ${entity}`, details, userId);

  const logDownload = (entity: string, details: string, userId?: string) => 
    logAction(`Download ${entity}`, details, userId);

  const logPrint = (entity: string, details: string, userId?: string) => 
    logAction(`Print ${entity}`, details, userId);

  const logSearch = (searchTerm: string, results: number, userId?: string) => 
    logAction('Search', `Searched for "${searchTerm}" - ${results} results found`, userId);

  const logPageView = (page: string, userId?: string) => 
    logAction('Page View', `Visited ${page}`, userId);

  const logError = (error: string, details?: string, userId?: string) => 
    logAction('Error', `${error}${details ? ` - ${details}` : ''}`, userId);

  return { 
    logAction,
    logLogin,
    logLogout,
    logCreate,
    logUpdate,
    logDelete,
    logView,
    logDownload,
    logPrint,
    logSearch,
    logPageView,
    logError
  };
};
