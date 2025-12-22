import { createTRPCRouter } from '../init';

import { authRouter } from '@/modules/auth/server/procedures';
import { tagsRouter } from '@/modules/tags/server/procedures';
import { reviewsRouter } from '@/modules/reviews/server/procedures';
import { libraryRouter } from '@/modules/library/server/procedures';
import { tenantsRouter } from '@/modules/tenants/server/router';
import { checkoutRouter } from '@/modules/checkout/server/procedures';
import { productsRouter } from '@/modules/products/server/procedures';
import { categoriesRouter } from '@/modules/categories/server/procedures';
import { transactionsRouter } from '@/modules/transactions/server/procedures';
import { adminRouter } from '@/modules/admin/server/procedures';
import { ordersRouter } from '@/modules/orders/server/procedures';
import { salesRouter } from '@/modules/sales/server/procedures';
import { chatRouter } from '@/modules/chat/server/procedures';
import { usersRouter } from '@/modules/users/server/procedures';
import { testEmailRouter } from '@/modules/test-email/server/procedures';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  tags: tagsRouter,
  tenants: tenantsRouter,
  reviews: reviewsRouter,
  library: libraryRouter,
  checkout: checkoutRouter,
  products: productsRouter,
  categories: categoriesRouter,
  transactions: transactionsRouter,
  admin: adminRouter,
  orders: ordersRouter,
  sales: salesRouter,
  chat: chatRouter,
  users: usersRouter,
  testEmail: testEmailRouter, // Temporary for debugging
});
// export type definition of API
export type AppRouter = typeof appRouter;
