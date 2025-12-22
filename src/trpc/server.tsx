import 'server-only'; // <-- ensure this file cannot be imported from the client
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { createTRPCContext } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';
// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});
// ...
// Create caller with async context - must await createTRPCContext
const getCaller = cache(async () => {
  const ctx = await createTRPCContext();
  return appRouter.createCaller(ctx);
});

// Minimal caller wrapper for server components
// Only exposes commonly used procedures
export const caller = {
  auth: {
    session: async () => {
      const c = await getCaller();
      return c.auth.session();
    },
  },
  tenants: {
    getCurrentTenant: async () => {
      const c = await getCaller();
      return c.tenants.getCurrentTenant();
    },
  },
} as const;
