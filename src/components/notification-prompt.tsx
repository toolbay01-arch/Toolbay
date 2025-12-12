'use client';

import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotificationPermission } from '@/hooks/use-notification-permission';

interface NotificationPromptProps {
  onDismiss?: () => void;
  autoShow?: boolean;
}

/**
 * Component to prompt users to enable browser notifications
 */
export function NotificationPrompt({ onDismiss, autoShow = true }: NotificationPromptProps) {
  const { permission, isSupported, requestPermission, isLoading } = useNotificationPermission();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not supported, already granted, or user dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null;
  }

  // Don't auto-show if disabled
  if (!autoShow && permission === 'default') {
    return null;
  }

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setIsDismissed(true);
      onDismiss?.();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base">Enable Notifications</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-sm">
          Get instant alerts for new payments, orders, and messages
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex gap-2">
          <Button
            onClick={handleEnable}
            disabled={isLoading}
            size="sm"
            className="flex-1"
          >
            {isLoading ? 'Requesting...' : 'Enable Notifications'}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
          >
            Not Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for navbar or header
 */
export function NotificationPromptCompact() {
  const { permission, isSupported, requestPermission, isLoading } = useNotificationPermission();

  if (!isSupported || permission !== 'default') {
    return null;
  }

  const handleEnable = async () => {
    await requestPermission();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnable}
      disabled={isLoading}
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {isLoading ? 'Enabling...' : 'Enable Alerts'}
    </Button>
  );
}

/**
 * Status indicator showing current notification state
 */
export function NotificationStatus() {
  const { permission, isSupported } = useNotificationPermission();

  if (!isSupported) {
    return null;
  }

  const getStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-green-600 dark:text-green-400';
      case 'denied':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (permission) {
      case 'granted':
        return 'Notifications enabled';
      case 'denied':
        return 'Notifications blocked';
      default:
        return 'Notifications not enabled';
    }
  };

  const Icon = permission === 'granted' ? Bell : BellOff;

  return (
    <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
      <Icon className="h-4 w-4" />
      <span>{getStatusText()}</span>
    </div>
  );
}
