/**
 * Notification Status Indicator
 * Shows notification enabled/disabled status in navbar with action button
 */

'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWebPush } from '@/hooks/use-web-push';

interface NotificationIndicatorProps {
  userId?: string;
}

export function NotificationIndicator({ userId }: NotificationIndicatorProps) {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = useWebPush({ userId });

  // Don't render if not supported or no user
  if (!isSupported || !userId) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={isSubscribed ? 'Notifications enabled' : 'Enable notifications'}
        >
          {isSubscribed ? (
            <>
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-green-500 rounded-full" />
            </>
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Push Notifications</h4>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'You will receive instant notifications for payments, orders, and messages'
                : 'Enable to get notified even when the browser is closed'}
            </p>
          </div>

          {isSubscribed ? (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
              <Bell className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-900 font-medium">
                Notifications enabled
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md">
              <BellOff className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-900 font-medium">
                Notifications disabled
              </span>
            </div>
          )}

          <Button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading}
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            className="w-full"
          >
            {isLoading
              ? 'Processing...'
              : isSubscribed
                ? 'Disable Notifications'
                : 'Enable Notifications'}
          </Button>

          {!isSubscribed && (
            <p className="text-[10px] text-muted-foreground text-center">
              💡 Mobile sellers: Get payment alerts instantly, even when browsing other apps!
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
