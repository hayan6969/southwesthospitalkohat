
import { useCreateAuditLog } from "./useDatabase";

// Cache the resolved IP for the session so we don't hit external services
// on every audit log call (which was causing major slowdowns / hangs after
// a few rapid entries because the third-party IP APIs would rate-limit).
let cachedIp: string | null = null;
let ipPromise: Promise<string> | null = null;

const fetchWithTimeout = async (url: string, ms: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const getUserIP = async (): Promise<string> => {
  if (cachedIp) return cachedIp;
  if (ipPromise) return ipPromise;

  ipPromise = (async () => {
    try {
      const response = await fetchWithTimeout('https://api.ipify.org?format=json', 1500);
      if (response.ok) {
        const data = await response.json();
        if (data?.ip && typeof data.ip === 'string') {
          cachedIp = data.ip;
          return cachedIp;
        }
      }
    } catch {
      // ignore – fall through to Unknown
    }
    cachedIp = 'Unknown';
    return cachedIp;
  })();

  return ipPromise;
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
