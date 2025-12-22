'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDeviceInfo } from '@/lib/notifications/mobile-detection';
import { getNotificationCapabilities } from '@/lib/notifications/notification-strategy';

/**
 * Mobile Notification Debug Component
 * Shows device/browser capabilities and notification status
 * Useful for troubleshooting mobile notification issues
 */
export function MobileNotificationDebug() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);

  useEffect(() => {
    const device = getDeviceInfo();
    const caps = getNotificationCapabilities();
    
    setDeviceInfo(device);
    setCapabilities(caps);

    // Check notification status
    const checkStatus = async () => {
      const status: any = {
        permission: 'Notification' in window ? Notification.permission : 'N/A',
        serviceWorkerRegistered: false,
        pushSubscribed: false,
      };

      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        status.serviceWorkerRegistered = !!reg;
        
        if (reg) {
          const sub = await reg.pushManager?.getSubscription();
          status.pushSubscribed = !!sub;
        }
      } catch (error) {
        console.error('Error checking notification status:', error);
      }

      setNotificationStatus(status);
    };

    checkStatus();
  }, []);

  if (!deviceInfo || !capabilities) {
    return null;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Mobile Debug Info
          <Badge variant={capabilities.canUseWebPush ? 'default' : 'destructive'}>
            {capabilities.strategy}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Info */}
        <div>
          <h3 className="font-semibold mb-2">Device</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Mobile: {deviceInfo.isMobile ? '✅' : '❌'}</div>
            <div>iOS: {deviceInfo.isIOS ? '✅' : '❌'}</div>
            <div>Android: {deviceInfo.isAndroid ? '✅' : '❌'}</div>
            <div>Standalone: {deviceInfo.isStandalone ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* Browser Info */}
        <div>
          <h3 className="font-semibold mb-2">Browser</h3>
          <div className="text-sm">
            <div>Name: {deviceInfo.browser.name}</div>
            <div>Version: {deviceInfo.browser.version}</div>
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <h3 className="font-semibold mb-2">Capabilities</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Web Push: {capabilities.canUseWebPush ? '✅' : '❌'}</div>
            <div>SSE: {capabilities.canUseSSE ? '✅' : '❌'}</div>
            <div>Strategy: <Badge variant="outline">{capabilities.strategy}</Badge></div>
          </div>
        </div>

        {/* Notification Status */}
        {notificationStatus && (
          <div>
            <h3 className="font-semibold mb-2">Notification Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Permission: <Badge variant={notificationStatus.permission === 'granted' ? 'default' : 'destructive'}>{notificationStatus.permission}</Badge></div>
              <div>SW Registered: {notificationStatus.serviceWorkerRegistered ? '✅' : '❌'}</div>
              <div>Push Subscribed: {notificationStatus.pushSubscribed ? '✅' : '❌'}</div>
            </div>
          </div>
        )}

        {/* Guidance */}
        {capabilities.guidance && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ {capabilities.guidance}
            </p>
          </div>
        )}

        {/* User Agent */}
        <div>
          <h3 className="font-semibold mb-2">User Agent</h3>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
            {deviceInfo.userAgent}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
