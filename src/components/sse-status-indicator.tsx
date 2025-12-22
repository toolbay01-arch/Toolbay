'use client';

import { useSSENotifications } from '@/hooks/use-sse-notifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

interface SSEStatusIndicatorProps {
  userId?: string;
  enabled?: boolean;
}

/**
 * Component to show SSE connection status
 * Useful for debugging and user feedback
 */
export function SSEStatusIndicator({ userId, enabled = true }: SSEStatusIndicatorProps) {
  const { isConnected, connectionError, reconnect } = useSSENotifications({
    userId,
    enabled
  });

  if (!enabled || !userId) {
    return null;
  }

  return (
    <Alert variant={isConnected ? 'default' : 'destructive'} className="max-w-md">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle className="mb-0">
          Real-time Notifications {isConnected ? 'Connected' : 'Disconnected'}
        </AlertTitle>
        <Badge variant={isConnected ? 'default' : 'destructive'} className="ml-auto">
          {isConnected ? (
            <><Wifi className="h-3 w-3 mr-1" /> Live</>
          ) : (
            <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
          )}
        </Badge>
      </div>
      
      {connectionError && (
        <AlertDescription className="mt-2">
          {connectionError}
          <Button 
            onClick={reconnect} 
            variant="outline" 
            size="sm" 
            className="ml-2"
          >
            Retry Now
          </Button>
        </AlertDescription>
      )}
    </Alert>
  );
}
