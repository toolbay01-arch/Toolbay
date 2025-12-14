'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallGlobal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // Debug info for mobile

  useEffect(() => {
    // Check if already installed/standalone (works on all browsers)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      // Additional check for Android Chrome
      window.location.search.includes('homescreen=1');
    
    setIsStandalone(isStandaloneMode);

    // Detect platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const iOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);
    const isBrave = !!(navigator as any).brave;
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isSamsung = /SamsungBrowser/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
    
    // Reset dismissal after 7 days to remind users
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (dismissed && dismissedTime && parseInt(dismissedTime) < sevenDaysAgo) {
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-time');
    }

    // Store debug info for mobile users (no console)
    const debugInfo = {
      isStandalone: isStandaloneMode,
      platform: iOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop',
      browser: isBrave ? 'Brave' : isChrome ? 'Chrome' : isSamsung ? 'Samsung' : isFirefox ? 'Firefox' : 'Other',
      dismissed: !!dismissed,
      supportsPWA: 'serviceWorker' in navigator && 'PushManager' in window,
      userAgent: userAgent.substring(0, 100)
    };
    
    // Store for debug panel
    (window as any).__pwaDebugInfo = debugInfo;

    // Show prompt if not dismissed and not standalone
    if (!dismissed && !isStandaloneMode) {
      // For iOS, always show manual instructions
      if (iOS) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
      // For Android/Desktop browsers, wait for beforeinstallprompt OR show fallback
      else {
        // Show fallback after 5 seconds if beforeinstallprompt doesn't fire
        const fallbackTimer = setTimeout(() => {
          if (!deferredPrompt) {
            setShowPrompt(true);
          }
        }, 5000);
        
        return () => clearTimeout(fallbackTimer);
      }
    }

    // Listen for the beforeinstallprompt event (Chromium browsers: Chrome, Brave, Edge, Samsung)
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // No native prompt available, just acknowledge
      handleDismiss();
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsStandalone(true);
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // Don't show if dismissed
  if (!showPrompt) {
    return null;
  }

  // iOS install instructions (works on any iOS device)
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
        <Card className="border-2 border-blue-500 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-sm">Install ToolBoxx</h3>
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
              Tap Share 📤 → Add to Home Screen
            </p>

            <Button
              size="sm"
              onClick={handleDismiss}
              className="w-full"
            >
              Got it!
            </Button>

            {/* Debug toggle for mobile */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
            >
              {showDebug ? 'Hide' : 'Show'} debug info
            </button>
            
            {showDebug && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono space-y-1">
                <div>Platform: {(window as any).__pwaDebugInfo?.platform}</div>
                <div>Browser: {(window as any).__pwaDebugInfo?.browser}</div>
                <div>PWA Support: {(window as any).__pwaDebugInfo?.supportsPWA ? 'Yes' : 'No'}</div>
                <div>Standalone: {(window as any).__pwaDebugInfo?.isStandalone ? 'Yes' : 'No'}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Android/Desktop install prompt (works on Chrome, Brave, Samsung, Edge, etc.)
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <Card className="border-2 border-blue-500 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm">Install ToolBoxx</h3>
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
            {deferredPrompt 
              ? 'Offline access & instant alerts!' 
              : 'Use browser menu → Install app or Add to Home screen'}
          </p>

          <Button
            onClick={handleInstallClick}
            size="sm"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {deferredPrompt ? 'Install App' : 'Got it!'}
          </Button>

          {/* Debug toggle for mobile */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
          >
            {showDebug ? 'Hide' : 'Show'} debug info
          </button>
          
          {showDebug && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono space-y-1 dark:bg-gray-700 dark:text-gray-300">
              <div>Platform: {(window as any).__pwaDebugInfo?.platform}</div>
              <div>Browser: {(window as any).__pwaDebugInfo?.browser}</div>
              <div>PWA Support: {(window as any).__pwaDebugInfo?.supportsPWA ? 'Yes' : 'No'}</div>
              <div>Native Prompt: {deferredPrompt ? 'Available' : 'Not available'}</div>
              <div>Standalone: {(window as any).__pwaDebugInfo?.isStandalone ? 'Yes' : 'No'}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
