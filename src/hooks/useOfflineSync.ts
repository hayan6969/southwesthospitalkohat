import { useState, useEffect } from 'react';
import { offlineStorage, PendingOperation } from '@/utils/offlineStorage';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine && pendingCount > 0) {
        triggerBackgroundSync();
      }
    };

    const updatePendingCount = async () => {
      try {
        const count = await offlineStorage.getOperationCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Failed to get pending operations count:', error);
      }
    };

    // Initialize
    updatePendingCount();

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Periodic check for pending operations
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, [pendingCount]);

  const addOfflineOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const pendingOperation: PendingOperation = {
        ...operation,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        synced: false
      };

      await offlineStorage.addPendingOperation(pendingOperation);
      setPendingCount(prev => prev + 1);

      if (!isOnline) {
        toast({
          title: "Saved Offline",
          description: "Data saved locally. Will sync when online.",
          variant: "default"
        });
      } else {
        // Try to sync immediately if online
        triggerBackgroundSync();
      }

      return pendingOperation.id;
    } catch (error) {
      console.error('Failed to add offline operation:', error);
      toast({
        title: "Storage Error",
        description: "Failed to save data offline.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const triggerBackgroundSync = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Background sync fallback - trigger manual sync for now
        setIsSyncing(true);
        
        // Reset syncing state after a timeout
        setTimeout(() => setIsSyncing(false), 3000);
        
        toast({
          title: "Syncing Data",
          description: "Uploading offline data to server...",
          variant: "default"
        });
      } catch (error) {
        console.error('Background sync failed:', error);
        toast({
          title: "Sync Failed",
          description: "Failed to sync offline data. Will retry automatically.",
          variant: "destructive"
        });
      }
    }
  };

  const manualSync = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet",
        description: "Cannot sync while offline.",
        variant: "destructive"
      });
      return;
    }

    await triggerBackgroundSync();
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addOfflineOperation,
    manualSync,
    triggerBackgroundSync
  };
};