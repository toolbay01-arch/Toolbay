/**
 * Web Push Subscription Component
 * UI for managing web push notification subscriptions
 */

'use client';

import { useWebPush } from '@/hooks/use-web-push';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WebPushSubscriptionProps {
  userId?: string;
  autoSubscribe?: boolean;
  compact?: boolean;
}

export function WebPushSubscription({ 
  userId, 
  autoSubscribe = false,
  compact = false 
}: WebPushSubscriptionProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = useWebPush({ userId, autoSubscribe });

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Compact version (just a button)
  if (compact) {
    return (
      <Button
        variant={isSubscribed ? 'outline' : 'default'}
        size="sm"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading || !userId}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <BellOff className="h-4 w-4 mr-2" />
            Disable Push
          </>
        ) : (
          <>
            <Bell className="h-4 w-4 mr-2" />
            Enable Push
          </>
        )}
      </Button>
    );
  }

  // Full card version
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant notifications even when the browser is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Push notifications are {isSubscribed ? 'enabled' : 'disabled'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'You will receive notifications for new payments, orders, and messages'
                : 'Enable to receive real-time notifications'}
            </p>
          </div>

          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading || !userId}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isSubscribed ? (
              <BellOff className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {isLoading
              ? 'Processing...'
              : isSubscribed
                ? 'Disable'
                : 'Enable'}
          </Button>
        </div>

        {!userId && (
          <p className="text-xs text-muted-foreground">
            Please log in to enable push notifications
          </p>
        )}
      </CardContent>
    </Card>
  );
}
