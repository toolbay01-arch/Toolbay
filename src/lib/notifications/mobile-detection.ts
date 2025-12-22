/**
 * Mobile Detection Utilities
 * Detect device type and capabilities for notification strategy
 */

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // Check if app is running in standalone mode (PWA)
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function canUseWebPush(): boolean {
  // Basic requirements
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  // iOS Safari requires standalone mode (PWA)
  if (isIOS() && !isStandalone()) {
    return false;
  }

  return true;
}

export function getBrowserInfo() {
  if (typeof window === 'undefined') {
    return { name: 'unknown', version: 'unknown' };
  }

  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let version = 'Unknown';

  if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge';
    version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  return { name: browserName, version };
}

export function getDeviceInfo() {
  return {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isStandalone: isStandalone(),
    canUseWebPush: canUseWebPush(),
    browser: getBrowserInfo(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
  };
}
