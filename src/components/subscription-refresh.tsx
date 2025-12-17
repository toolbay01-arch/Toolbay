/**
 * Subscription Refresh Manager
 * Keeps push subscriptions alive by periodically refreshing them
 * This prevents subscriptions from becoming stale when sessions expire
 */

'use client';

import { useEffect } from 'react';
import { useWebPush } from '../hooks/use-web-push';

interface SubscriptionRefreshProps {
  userId?: string;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds, default 1 hour
}

export function SubscriptionRefresh({ 
  userId, 
  enabled = true,
  refreshInterval = 3600000, // 1 hour
}: SubscriptionRefreshProps) {
  const { isSubscribed, subscribe } = useWebPush({ userId });

  useEffect(() => {
    if (!enabled || !userId || !isSubscribed) {
      return;
    }

    console.log('[SubscriptionRefresh] Starting periodic refresh (interval:', refreshInterval, 'ms)');

    // Refresh subscription periodically to keep it alive
    const intervalId = setInterval(async () => {
      console.log('[SubscriptionRefresh] Refreshing subscription...');
      
      try {
        // Re-subscribe to ensure subscription is fresh
        await subscribe();
        console.log('[SubscriptionRefresh] ✅ Subscription refreshed successfully');
      } catch (error) {
        console.error('[SubscriptionRefresh] ❌ Failed to refresh subscription:', error);
      }
    }, refreshInterval);

    // Also refresh on page visibility change (user returns to app)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[SubscriptionRefresh] Page became visible, refreshing subscription...');
        try {
          await subscribe();
          console.log('[SubscriptionRefresh] ✅ Subscription refreshed on visibility change');
        } catch (error) {
          console.error('[SubscriptionRefresh] ❌ Failed to refresh on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('[SubscriptionRefresh] Cleanup complete');
    };
  }, [userId, isSubscribed, enabled, refreshInterval, subscribe]);

  // This component doesn't render anything
  return null;
}
