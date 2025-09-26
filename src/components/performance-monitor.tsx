'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function PerformanceMonitor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Monitor query cache
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'added') {
        console.log('🔄 Query added:', event.query.queryKey);
      }
      if (event.type === 'updated') {
        const query = event.query;
        if (query.state.status === 'error') {
          console.error('❌ Query error:', query.queryKey, query.state.error);
        }
        if (query.state.status === 'success') {
          console.log('✅ Query success:', query.queryKey, 'Data:', query.state.data);
        }
      }
    });

    // Performance monitoring
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          console.log('🚀 Navigation timing:', {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            loadComplete: nav.loadEventEnd - nav.loadEventStart,
            firstContentfulPaint: nav.domContentLoadedEventEnd - nav.fetchStart,
          });
        }
        
        if (entry.entryType === 'measure' && entry.name.includes('tRPC')) {
          console.log('📊 tRPC measure:', entry.name, `${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation', 'measure'] });
    } catch (e) {
      // Some browsers don't support all entry types
    }

    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [queryClient]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
      <div>Performance Monitor Active</div>
      <div>Check console for details</div>
    </div>
  );
}
