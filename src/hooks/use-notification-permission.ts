'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/lib/notifications/browser-notifications';

export interface UseNotificationPermissionResult {
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  isLoading: boolean;
}

/**
 * Hook to manage browser notification permissions
 */
export function useNotificationPermission(): UseNotificationPermissionResult {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize permission state
    if (notificationService.isSupported()) {
      setPermission(notificationService.getPermission());
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await notificationService.requestPermission();
      setPermission(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permission,
    isSupported: notificationService.isSupported(),
    isEnabled: notificationService.isEnabled(),
    requestPermission,
    isLoading,
  };
}
