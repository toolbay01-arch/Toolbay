'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';

/**
 * SessionMonitor - Monitors user session and automatically refreshes
 * the page when the session expires (user logs out or session times out)
 */
export function SessionMonitor() {
  const router = useRouter();
  const trpc = useTRPC();
  const previousUserIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Monitor session with regular refetching
  const { data: session } = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale to detect logout
  });

  useEffect(() => {
    const currentUserId = session?.user?.id || null;

    // Skip the initial render - just set the reference
    if (!isInitializedRef.current) {
      previousUserIdRef.current = currentUserId;
      isInitializedRef.current = true;
      return;
    }

    // Check if user was logged in and now is logged out (session expired/logout)
    if (previousUserIdRef.current && !currentUserId) {
      console.log('Session expired - refreshing page...');
      
      // Refresh the page to clear all client-side state
      window.location.href = '/';
      return;
    }

    // Update the reference for next comparison
    previousUserIdRef.current = currentUserId;
  }, [session?.user?.id, router]);

  // This component doesn't render anything
  return null;
}
