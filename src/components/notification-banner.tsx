/**
 * Notification Banner Component
 * Prompts users to enable push notifications with a dismissible banner
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebPush } from '@/hooks/use-web-push';

interface NotificationBannerProps {
  userId?: string;
  storageKey?: string;
}

export function NotificationBanner({ 
  userId,
  storageKey = 'notification-banner-dismissed'
}: NotificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const { isSupported, isSubscribed, subscribe, isLoading } = useWebPush({ userId });

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem(storageKey);
    
    // Show banner if:
    // 1. Not dismissed
    // 2. Browser supports notifications
    // 3. User is logged in
    // 4. Not already subscribed
    if (!dismissed && isSupported && userId && !isSubscribed) {
      setIsDismissed(false);
    }
  }, [isSupported, userId, isSubscribed, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  const handleEnable = async () => {
    await subscribe();
    handleDismiss();
  };

  if (isDismissed || !isSupported || !userId || isSubscribed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Stay updated with instant notifications!
              </p>
              <p className="text-xs opacity-90">
                Get notified about payments, orders, and messages even when the browser is closed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEnable}
              disabled={isLoading}
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
