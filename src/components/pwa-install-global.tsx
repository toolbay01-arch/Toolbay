'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallGlobal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             (window.innerWidth <= 768);
    };
    
    setIsMobile(checkMobile());

    // Check if already installed/standalone (works on all browsers)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('homescreen=1');
    
    setIsStandalone(isStandaloneMode);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    // Reset dismissal after 7 days to remind users
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (dismissed && dismissedTime && parseInt(dismissedTime) < sevenDaysAgo) {
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-time');
    }

    // Force service worker update to get latest code
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.update(); // Check for new service worker
        });
      });
    }

    // Listen for the beforeinstallprompt event (Chromium browsers) - MUST be set up early!
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setIsStandalone(true);
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-time');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt if not dismissed and not standalone (after setting up listeners)
    if (!dismissed && !isStandaloneMode) {
      // Wait for beforeinstallprompt to fire, or show after 3 seconds as fallback
      const fallbackTimer = setTimeout(() => {
        if (!deferredPrompt) {
          // Only show if beforeinstallprompt hasn't fired yet
          setShowPrompt(true);
        }
      }, 3000);
      
      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // No native prompt available, just dismiss silently
      // User can still install via browser menu if needed
      handleDismiss();
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsStandalone(true);
      } else {
        handleDismiss();
      }
    } catch (error) {
      console.error('Install prompt error:', error);
      handleDismiss();
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed, not ready, or not on mobile
  if (isStandalone || !showPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <Card className="border-2 border-blue-500 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm">Install ToolBay</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Offline access & instant alerts!
          </p>

          <Button
            onClick={handleInstallClick}
            size="sm"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
