// Offline storage utilities for IndexedDB operations
export interface PendingOperation {
  id: string;
  type: 'invoice' | 'appointment' | 'patient' | 'medical_record' | 'create_patient_with_profile';
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
}

class OfflineStorage {
  private dbName = 'HealthNexusOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const store = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
          cacheStore.createIndex('table', 'table', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addPendingOperation(operation: PendingOperation): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      
      const request = store.add(operation);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Added pending operation:', operation.id);
        resolve();
      };
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      
      const request = index.getAll(IDBKeyRange.only(false)); // Get unsynced operations
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async markOperationSynced(operationId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      
      const getRequest = store.get(operationId);
      
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.synced = true;
          const putRequest = store.put(operation);
          
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => {
            console.log('Marked operation as synced:', operationId);
            resolve();
          };
        } else {
          resolve(); // Operation not found, consider it synced
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteSyncedOperations(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('synced');
      
      const request = index.openCursor(IDBKeyRange.only(true));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('Deleted all synced operations');
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async cacheData(key: string, table: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      
      const cacheEntry = {
        key,
        table,
        data,
        timestamp: new Date().toISOString()
      };
      
      const request = store.put(cacheEntry);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Cached data:', key);
        resolve();
      };
    });
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async getOperationCount(): Promise<number> {
    const operations = await this.getPendingOperations();
    return operations.length;
  }

  async removePendingOperation(operationId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      
      const request = store.delete(operationId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Removed pending operation:', operationId);
        resolve();
      };
    });
  }

  async clearPendingOperations(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingOperations'], 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Cleared all pending operations');
        resolve();
      };
    });
  }
}

export const offlineStorage = new OfflineStorage();

// Export for use in other modules
export const addOfflineOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'synced'>) => {
  const pendingOperation: PendingOperation = {
    ...operation,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    synced: false
  };

  return await offlineStorage.addPendingOperation(pendingOperation);
};