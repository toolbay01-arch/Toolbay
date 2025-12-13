/**
 * Auto Push Subscriber Component
 * Automatically subscribes users to push notifications on login
 * Add this to your layout for seamless push subscription
 */

'use client';

import { useEffect } from 'react';
import { useWebPush } from '@/hooks/use-web-push';

interface AutoPushSubscriberProps {
  userId?: string;
  autoSubscribe?: boolean;
}

export function AutoPushSubscriber({ 
  userId, 
  autoSubscribe = true 
}: AutoPushSubscriberProps) {
  const { isSupported, isSubscribed, subscribe } = useWebPush({ 
    userId, 
    autoSubscribe: false // We'll handle this manually for more control
  });

  useEffect(() => {
    // Only auto-subscribe if:
    // 1. Browser supports push
    // 2. User is logged in
    // 3. Not already subscribed
    // 4. Auto-subscribe is enabled
    if (autoSubscribe && isSupported && userId && !isSubscribed) {
      // Small delay to ensure user has landed on the page
      const timer = setTimeout(() => {
        subscribe();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoSubscribe, isSupported, userId, isSubscribed, subscribe]);

  // This is a headless component - no UI
  return null;
}
