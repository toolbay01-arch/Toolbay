'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Share, Smartphone } from 'lucide-react';
import { shouldShowInstallPrompt } from '@/lib/notifications/notification-strategy';

interface IOSInstallPromptProps {
  onDismiss?: () => void;
}

/**
 * iOS PWA Install Prompt
 * Shows instructions for iOS users to add app to home screen
 * Required for push notifications to work on iOS
 */
export function IOSInstallPrompt({ onDismiss }: IOSInstallPromptProps) {
  const [show, setShow] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    if (shouldShowInstallPrompt()) {
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
      if (!dismissed) {
        setShow(true);
      } else {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setIsDismissed(true);
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
    onDismiss?.();
  };

  const handleRemindLater = () => {
    setShow(false);
    // Don't set dismissed flag, will show again on next visit
    onDismiss?.();
  };

  if (!show || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/20 to-transparent">
      <Card className="max-w-md mx-auto border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  📱 Install App for Notifications
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Get instant alerts for payments, orders & messages on your iPhone
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Quick Setup (30 seconds):
                </p>
                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
                    <span>Tap the <Share className="inline h-3 w-3 mx-1" /> Share button below</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
                    <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
                    <span>Open the app from your home screen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 flex-shrink-0">4.</span>
                    <span>Allow notifications when prompted ✅</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRemindLater}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Remind Later
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                💡 This is required for iOS push notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact version for settings/notification pages
 */
export function IOSInstallInstructions() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShowInstallPrompt());
  }, []);

  if (!show) {
    return null;
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
      <Smartphone className="h-4 w-4" />
      <AlertTitle>iOS Setup Required</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          To enable notifications on iPhone, add this app to your home screen:
        </p>
        <ol className="text-sm space-y-1 ml-4">
          <li>1. Tap Share <Share className="inline h-3 w-3" /> → "Add to Home Screen"</li>
          <li>2. Open app from home screen</li>
          <li>3. Allow notifications</li>
        </ol>
      </AlertDescription>
    </Alert>
  );
}
