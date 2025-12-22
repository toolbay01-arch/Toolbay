/**
 * Browser-only utilities for persisting React Query cache
 * This helps reduce delays on subsequent visits
 */

const CACHE_KEY = 'react-query-cache';
const CACHE_VERSION = '1';
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

interface CacheData {
  version: string;
  timestamp: number;
  data: any;
}

export const persistCache = {
  save: (data: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData: CacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      // Ignore errors (quota exceeded, etc.)
      console.warn('Failed to persist cache:', error);
    }
  },

  load: (): any | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      
      // Check version and expiry
      if (
        cacheData.version !== CACHE_VERSION ||
        Date.now() - cacheData.timestamp > CACHE_EXPIRY
      ) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      // Clear corrupted cache
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_KEY);
  },
};
