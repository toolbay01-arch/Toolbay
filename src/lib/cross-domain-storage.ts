/**
 * Cross-Domain Storage Utilities
 * 
 * Uses cookies with domain attribute to share data across subdomains
 * This ensures PWA install and notification prompts are consistent
 * across main domain and all subdomains
 */

const COOKIE_OPTIONS = {
  // Set to root domain to work across all subdomains
  domain: typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN.split(':')[0]}` // Add leading dot for subdomains
    : undefined,
  path: '/',
  // SameSite=None for cross-subdomain access, but requires Secure
  sameSite: 'Lax' as const,
  // 365 days expiry
  maxAge: 365 * 24 * 60 * 60,
};

/**
 * Set a value in cross-domain storage (cookie)
 */
export function setCrossDomainItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;

  const domain = COOKIE_OPTIONS.domain;
  const cookieString = [
    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    `path=${COOKIE_OPTIONS.path}`,
    domain ? `domain=${domain}` : '',
    `max-age=${COOKIE_OPTIONS.maxAge}`,
    `SameSite=${COOKIE_OPTIONS.sameSite}`,
  ].filter(Boolean).join('; ');

  document.cookie = cookieString;
}

/**
 * Get a value from cross-domain storage (cookie)
 */
export function getCrossDomainItem(key: string): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const encodedKey = encodeURIComponent(key);

  for (const cookie of cookies) {
    const [cookieKey, cookieValue] = cookie.trim().split('=');
    if (cookieKey === encodedKey && cookieValue !== undefined) {
      return decodeURIComponent(cookieValue);
    }
  }

  return null;
}

/**
 * Remove a value from cross-domain storage (cookie)
 */
export function removeCrossDomainItem(key: string): void {
  if (typeof window === 'undefined') return;

  const domain = COOKIE_OPTIONS.domain;
  const cookieString = [
    `${encodeURIComponent(key)}=`,
    `path=${COOKIE_OPTIONS.path}`,
    domain ? `domain=${domain}` : '',
    'max-age=0', // Expire immediately
    `SameSite=${COOKIE_OPTIONS.sameSite}`,
  ].filter(Boolean).join('; ');

  document.cookie = cookieString;
}

/**
 * Check if a cross-domain item exists
 */
export function hasCrossDomainItem(key: string): boolean {
  return getCrossDomainItem(key) !== null;
}

/**
 * Migrate existing localStorage data to cookies for cross-domain support
 */
export function migrateLocalStorageToCookies(keys: string[]): void {
  if (typeof window === 'undefined') return;

  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        setCrossDomainItem(key, value);
        // Keep localStorage for backward compatibility
        // localStorage.removeItem(key); // Uncomment if you want to remove after migration
      }
    } catch (error) {
      console.error(`Failed to migrate ${key}:`, error);
    }
  });
}
