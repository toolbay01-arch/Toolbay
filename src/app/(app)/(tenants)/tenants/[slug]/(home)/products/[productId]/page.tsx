import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getQueryClient, trpc } from "@/trpc/server";

import { ProductView, ProductViewSkeleton } from "@/modules/products/ui/views/product-view";

interface Props {
  params: Promise<{ productId: string; slug: string }>;
};

export const dynamic = "force-dynamic";

const Page = async ({ params }: Props) => {
  const { productId, slug } = await params;

  const queryClient = getQueryClient();
  
  // Prefetch both tenant and product data on the server
  void queryClient.prefetchQuery(trpc.tenants.getOne.queryOptions({
    slug,
  }));
  
  // Prefetch product data to avoid client-side loading delay
  void queryClient.prefetchQuery(trpc.products.getOne.queryOptions({
    id: productId,
  }));

  return ( 
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ProductViewSkeleton />}>
        <ProductView productId={productId} tenantSlug={slug} />
      </Suspense>
    </HydrationBoundary>
  );
}
 
export default Page;
