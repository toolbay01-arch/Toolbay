/**
 * Client Notification Wrapper
 * Wraps notification components with user session data
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { NotificationBanner } from './notification-banner';
import { PWAInstallPrompt } from './pwa-install-prompt';

export function ClientNotificationWrapper() {
  const trpc = useTRPC();
  
  const { data: session } = useQuery({
    ...trpc.auth.session.queryOptions(),
    staleTime: 30000, // 30 seconds
  });

  const userId = session?.user?.id;

  return (
    <>
      <NotificationBanner userId={userId} />
      <PWAInstallPrompt />
    </>
  );
}
