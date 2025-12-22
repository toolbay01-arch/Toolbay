'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/lib/notifications/browser-notifications';

/**
 * Debug component to check notification status
 * Add this temporarily to your page to see what's happening
 */
export function NotificationDebug() {
  const [status, setStatus] = useState({
    isSupported: false,
    permission: 'unknown' as NotificationPermission | 'unknown',
    isEnabled: false,
  });

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = () => {
    setStatus({
      isSupported: notificationService.isSupported(),
      permission: notificationService.isSupported() 
        ? notificationService.getPermission() 
        : 'unknown',
      isEnabled: notificationService.isEnabled(),
    });
  };

  const handleRequestPermission = async () => {
    await notificationService.requestPermission();
    updateStatus();
  };

  const handleTestNotification = async () => {
    if (!notificationService.isEnabled()) {
      await notificationService.requestPermission();
    }
    await notificationService.showPaymentNotification('RWF 50,000', 'test-123');
    updateStatus();
  };

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-base">🐛 Notification Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm space-y-1">
          <p><strong>Browser Support:</strong> {status.isSupported ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Permission Status:</strong> {status.permission}</p>
          <p><strong>Notifications Enabled:</strong> {status.isEnabled ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Browser:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Unknown'}</p>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button onClick={handleRequestPermission} size="sm">
            Request Permission
          </Button>
          <Button onClick={handleTestNotification} variant="outline" size="sm">
            Test Notification
          </Button>
          <Button onClick={updateStatus} variant="ghost" size="sm">
            Refresh Status
          </Button>
        </div>

        <div className="text-xs text-gray-600 mt-2">
          <p><strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside">
            <li>If permission = "default" → Prompt should show</li>
            <li>If permission = "granted" → No prompt (already enabled)</li>
            <li>If permission = "denied" → No prompt (user blocked it)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
