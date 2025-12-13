/**
 * React Hook for Web Push Notifications
 * Provides easy integration of web push into React components
 */

import { useState, useEffect, useCallback } from 'react';
import { webPushService } from '@/lib/notifications/web-push';

export interface UseWebPushOptions {
  userId?: string;
  autoSubscribe?: boolean;
}

export interface UseWebPushReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  testNotification: () => Promise<void>;
}

export function useWebPush(options: UseWebPushOptions = {}): UseWebPushReturn {
  const { userId, autoSubscribe = false } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check support and subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supported = webPushService.isSupported();
        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Check if already subscribed
        const subscription = await webPushService.getSubscription();
        setIsSubscribed(!!subscription);

        // Auto-subscribe if enabled and user is logged in
        if (autoSubscribe && !subscription && userId) {
          await handleSubscribe();
        }
      } catch (err) {
        console.error('Error checking push status:', err);
        setError('Failed to check push notification status');
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [userId, autoSubscribe]);

  const handleSubscribe = useCallback(async () => {
    if (!userId) {
      setError('User ID is required to subscribe');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await webPushService.subscribe(userId);
      
      if (subscription) {
        setIsSubscribed(true);
        console.log('Successfully subscribed to push notifications');
      } else {
        setError('Failed to subscribe. Please check permissions.');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('An error occurred while subscribing');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await webPushService.unsubscribe();
      
      if (success) {
        setIsSubscribed(false);
        console.log('Successfully unsubscribed from push notifications');
      } else {
        setError('Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError('An error occurred while unsubscribing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTestNotification = useCallback(async () => {
    try {
      await webPushService.testNotification();
    } catch (err) {
      console.error('Test notification error:', err);
      setError('Failed to send test notification');
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
    testNotification: handleTestNotification,
  };
}
