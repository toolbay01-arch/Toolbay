/**
 * Notification Blocked Banner
 * Shows when user has blocked notifications with instructions to unblock
 */

'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationBlockedBannerProps {
  userId?: string;
  storageKey?: string;
}

export function NotificationBlockedBanner({ 
  userId,
  storageKey = 'notification-blocked-banner-dismissed'
}: NotificationBlockedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Only check if user is logged in
    if (!userId) {
      return;
    }

    const dismissed = localStorage.getItem(storageKey);
    
    // Check if notifications are blocked
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      // Show banner if not dismissed
      if (!dismissed) {
        setIsDismissed(false);
      }
    }
  }, [userId, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
    setShowInstructions(false);
  };

  if (isDismissed || !userId) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="container mx-auto px-3 py-2">
        {!showInstructions ? (
          <div className="flex items-center justify-between gap-2">
            {/* Warning message */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium truncate">
                Notifications blocked
              </p>
            </div>
            
            {/* Fix button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInstructions(true)}
              className="flex-shrink-0 h-7 px-3 text-xs font-medium"
            >
              <Info className="h-3 w-3 mr-1" />
              Fix
            </Button>
            
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs sm:text-sm font-semibold">
                  How to unblock notifications:
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <ol className="text-xs space-y-1 pl-6 list-decimal">
              <li>Click the lock icon 🔒 in your address bar</li>
              <li>Find "Notifications" in the permissions list</li>
              <li>Change from "Block" to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
            
            <p className="text-xs opacity-90">
              💡 <strong>Desktop:</strong> Settings → Privacy → Site Settings → Notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
