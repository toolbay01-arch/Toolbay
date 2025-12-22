/**
 * Notification Strategy Selector
 * Determines the best notification method based on device/browser capabilities
 */

import { canUseWebPush, isIOS, isStandalone, isAndroid } from './mobile-detection';

export type NotificationStrategy = 
  | 'web-push'    // Full push notifications (requires SW + permission)
  | 'sse'         // Server-Sent Events (real-time, no push)
  | 'polling'     // Traditional polling (fallback)
  | 'in-app';     // In-app banners only (last resort)

export function getNotificationStrategy(): NotificationStrategy {
  // iOS Safari (not PWA) → Cannot use web push
  if (isIOS() && !isStandalone()) {
    console.log('[Strategy] iOS Safari detected → Using SSE + in-app fallback');
    return 'in-app';
  }

  // Can use full web push (Android Chrome, iOS PWA, Desktop)
  if (canUseWebPush()) {
    console.log('[Strategy] Web Push supported → Using web push');
    return 'web-push';
  }

  // Browser supports SSE but not push
  if ('EventSource' in window) {
    console.log('[Strategy] EventSource supported → Using SSE');
    return 'sse';
  }

  // Fallback to polling
  console.log('[Strategy] Limited support → Using polling');
  return 'polling';
}

export function showNotificationGuidance(): string | null {
  // iOS Safari users need to install PWA first
  if (isIOS() && !isStandalone()) {
    return 'To enable push notifications on iPhone, add this app to your home screen first. Tap the Share button, then "Add to Home Screen".';
  }

  // Android but no push support (rare)
  if (isAndroid() && !canUseWebPush()) {
    return 'Your browser does not support push notifications. Please update to the latest version of Chrome.';
  }

  return null;
}

export function getNotificationCapabilities() {
  return {
    strategy: getNotificationStrategy(),
    canUseWebPush: canUseWebPush(),
    canUseSSE: 'EventSource' in window,
    canUsePolling: true, // Always available
    guidance: showNotificationGuidance(),
    requiresSetup: isIOS() && !isStandalone()
  };
}

export function shouldShowInstallPrompt(): boolean {
  // Show install prompt for iOS Safari users
  return isIOS() && !isStandalone();
}
