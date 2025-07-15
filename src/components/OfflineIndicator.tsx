import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Upload, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export const OfflineIndicator = () => {
  const { isOnline, pendingCount, isSyncing, manualSync } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-green-600">
        <Wifi className="h-3 w-3" />
        Online
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1 text-green-600">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={manualSync}
          disabled={isSyncing}
          className="flex items-center gap-1 text-xs"
        >
          <Upload className="h-3 w-3" />
          {isSyncing ? 'Syncing...' : `Sync ${pendingCount}`}
        </Button>
      </div>
    );
  }

  return null;
};