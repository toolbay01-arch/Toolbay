"use client";

import { useEffect, useRef } from "react";
import { InboxIcon } from "lucide-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { DEFAULT_LIMIT } from "@/constants";
import { Button } from "@/components/ui/button";

import { ProductCard, ProductCardSkeleton } from "./product-card";
import { useProductFilters } from "../../hooks/use-product-filters";

interface Props {
  category?: string;
  tenantSlug?: string;
  narrowView?: boolean;
  viewMode?: "grid" | "list";
};

export const ProductList = ({ category, tenantSlug, narrowView, viewMode = "grid" }: Props) => {
  const [filters] = useProductFilters();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  const { 
    data, 
    hasNextPage, 
    isFetchingNextPage, 
    fetchNextPage
  } = useSuspenseInfiniteQuery(trpc.products.getMany.infiniteQueryOptions(
    {
      ...filters,
      category,
      tenantSlug,
      limit: DEFAULT_LIMIT,
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.docs.length > 0 ? lastPage.nextPage : undefined;
      },
    }
  ));

  // Infinite scroll: Load more when the sentinel element is visible
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (data.pages?.[0]?.docs.length === 0) {
    return (
      <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
        <InboxIcon />
        <p className="text-base font-medium">No products found</p>
      </div>
    )
  }


  return (
    <>
      <div className={cn(
        viewMode === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-4"
          : "flex flex-col gap-2 md:gap-4",
        viewMode === "grid" && narrowView && "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
      )}>
        {data?.pages.flatMap((page) => page.docs).map((product, index) => {
          // Build gallery array from product data
          const gallery: Array<{ url: string; alt: string }> = [];
          
          // Type assertion for gallery field
          const productWithGallery = product as any;
          if (productWithGallery.gallery && Array.isArray(productWithGallery.gallery)) {
            productWithGallery.gallery.forEach((item: any) => {
              if (item.media && typeof item.media === 'object' && item.media.url) {
                gallery.push({
                  url: item.media.url,
                  alt: item.media.alt || product.name,
                });
              }
            });
          }

          return (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              imageUrl={product.image?.url}
              gallery={gallery.length > 0 ? gallery : null}
              tenantSlug={product.tenant?.slug}
              tenantName={product.tenant?.name}
              tenantImageUrl={product.tenant?.image?.url}
              tenantLocation={product.tenant?.location || null}
              tenantIsVerified={product.tenant?.isVerified || false}
              tenantSuccessfulOrders={0} // TODO: Add successful orders count
              reviewRating={product.reviewRating}
              reviewCount={product.reviewCount}
              price={product.price}
              quantity={product.quantity}
              unit={product.unit}
              stockStatus={product.stockStatus}
              viewMode={viewMode}
              priority={index < 2} // Only prioritize first 2 images to avoid unused preloads
              totalSold={(product as any).totalSold || 0}
              viewCount={(product as any).viewCount || 0}
            />
          );
        })}
      </div>
      
      {/* Infinite scroll sentinel - triggers loading when visible */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center pt-8 pb-4">
          {isFetchingNextPage && (
            <div className="text-sm text-gray-500">Loading more products...</div>
          )}
        </div>
      )}

      {/* Manual Load More button (commented out for infinite scroll) */}
      {/* <div className="flex justify-center pt-8">
        {hasNextPage && (
          <Button
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="font-medium disabled:opacity-50 text-base bg-white"
            variant="elevated"
          >
            Load more
          </Button>
        )}
      </div> */}
    </>
  );
};

export const ProductListSkeleton = ({ narrowView, viewMode = "grid" }: Props) => {
  return (
    <div className={cn(
      viewMode === "grid"
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-4"
        : "flex flex-col gap-2 md:gap-4",
      viewMode === "grid" && narrowView && "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5"
    )}>
      {Array.from({ length: DEFAULT_LIMIT }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};
