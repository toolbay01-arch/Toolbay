'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function PerformanceMonitor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Monitor query cache for errors only
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'updated') {
        const query = event.query;
        if (query.state.status === 'error') {
          console.error('❌ Query error:', query.queryKey, query.state.error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return null;
}
