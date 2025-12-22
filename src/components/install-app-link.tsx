/**
 * Install App Link Component
 * Footer link to manually trigger PWA installation
 */

'use client';

import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppLink() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: Show instructions for manual install
      alert(
        'To install this app:\n\n' +
        '• On Mobile: Tap your browser menu (⋮) → "Add to Home Screen"\n' +
        '• On Desktop: Click the install icon in the address bar'
      );
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    // Clear the prompt
    setDeferredPrompt(null);
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Smartphone className="h-3.5 w-3.5" />
      <span>Install App</span>
    </button>
  );
}
