"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageIcon, TrendingUp, DollarSign, MessageCircle, Grid3x3, List } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MySalesListProps {
  searchQuery?: string;
  statusFilter?: string | null;
}

export const MySalesList = ({ searchQuery, statusFilter }: MySalesListProps) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Responsive view mode: list on mobile, grid on desktop by default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  useEffect(() => {
    // Set initial view based on screen size
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? 'list' : 'grid');
  }, []);
  
  const { data: session } = useQuery(trpc.auth.session.queryOptions());
  
  const startConversation = useMutation(trpc.chat.startConversation.mutationOptions({
    onSuccess: (data) => {
      // Just navigate immediately - the page will fetch fresh data with messages included
      router.push(`/chat/${data.id}`);
      toast.success("Chat started with customer");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start chat");
    },
  }));
  
  const handleMessageCustomer = (sale: any) => {
    if (!session?.user) {
      toast.error("Please log in to message the customer");
      router.push("/sign-in?redirect=/dashboard/my-sales");
      return;
    }
    
    if (!sale.customerId) {
      toast.error("Unable to contact customer");
      return;
    }
    
    // Don't allow messaging yourself
    if (sale.customerId === session.user.id) {
      toast.error("You cannot message yourself");
      return;
    }
    
    const productName = typeof sale.product === 'object' ? sale.product.name : "your product";
    
    startConversation.mutate({
      participantId: sale.customerId,
      orderId: sale.order,
      initialMessage: `Hi, regarding your purchase of "${productName}" (Sale #${sale.saleNumber})`,
    });
  };
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = 
    useInfiniteQuery(
      trpc.sales.getMySales.infiniteQueryOptions({
        search: searchQuery || null,
        status: statusFilter as any || null,
      }, {
        getNextPageParam: (lastPage) => {
          if (lastPage.hasNextPage) {
            return lastPage.nextPage;
          }
          return undefined;
        },
      })
    );

  if (isLoading) {
    return <MySalesListSkeleton />;
  }

  const sales = data?.pages.flatMap((page) => page.docs) ?? [];

  if (sales.length === 0) {
    return (
      <div className="text-center py-12">
        <PackageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sales yet</h3>
        <p className="text-gray-500">
          {searchQuery || statusFilter
            ? "No sales match your filters."
            : "Sales will appear here when customers purchase your products."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="gap-2"
        >
          <Grid3x3 className="h-4 w-4" />
          Grid
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          List
        </Button>
      </div>

      {/* Grid view */}
      <div className={cn(
        viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
          : "space-y-3"
      )}>
        {sales.map((sale) => {
          const product = typeof sale.product === 'object' ? sale.product : null;
          
          // Extract image URL - handle both populated and unpopulated cases
          let imageUrl = null;
          if (product?.image) {
            // If image is a populated object with url
            if (typeof product.image === 'object' && product.image.url) {
              imageUrl = product.image.url;
            }
          }

          if (viewMode === 'list') {
            // List view - matching homepage product card style
            return (
              <div 
                key={sale.id}
                className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden flex flex-row cursor-pointer max-w-full"
              >
                {/* Image on the left */}
                <div className="relative w-42 h-42 xs:w-54 xs:h-54 sm:w-40 sm:h-40 md:w-48 md:h-48 shrink-0 border-r-2 border-black">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product?.name || 'Product'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 475px) 168px, (max-width: 640px) 216px, (max-width: 768px) 160px, 192px"
                      loading="lazy"
                      quality={75}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <PackageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>
                
                {/* Product details */}
                <div className="flex-1 p-2 xs:p-3 sm:p-4 flex flex-col justify-between gap-1.5 xs:gap-2 min-w-0">
                  {/* Product Name with Status Badge */}
                  <div className="flex items-start justify-between gap-1 sm:gap-2">
                    <h2 className="text-sm xs:text-base sm:text-lg font-semibold line-clamp-2 hover:text-gray-700 flex-1">
                      {product?.name || 'Unknown Product'}
                    </h2>
                    <StatusBadge status={sale.status} />
                  </div>
                  
                  {/* Sale Info */}
                  <div className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
                    Sale #{sale.saleNumber}
                  </div>
                  
                  {/* Price with unit */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="relative px-2 sm:px-3 py-1 sm:py-1.5 border-2 border-black bg-pink-400 w-fit rounded">
                      <p className="text-sm xs:text-base sm:text-lg font-bold">
                        {sale.totalAmount.toLocaleString()} RWF
                      </p>
                    </div>
                    <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
                      {sale.quantity} {product?.unit || 'unit'}(s)
                    </p>
                  </div>
                  
                  {/* Customer Info */}
                  <div className="flex flex-col gap-1">
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {sale.customerName}
                    </p>
                    
                    {/* Date & Message Button */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      
                      {sale.customerId && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageCustomer(sale);
                          }} 
                          className="bg-blue-600 hover:bg-blue-700 h-6 sm:h-7 px-2 sm:px-3 text-xs z-10"
                          disabled={startConversation.isPending}
                          size="sm"
                        >
                          <MessageCircle className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">
                            {startConversation.isPending ? "..." : "Message"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Grid view - matching homepage product card style
          return (
            <div 
              key={sale.id}
              className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-black rounded-lg bg-white overflow-hidden h-full flex flex-col cursor-pointer"
            >
              {/* Product Image */}
              <div className="relative aspect-square border-b-2 border-black">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product?.name || 'Product'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    loading="lazy"
                    quality={75}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <PackageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={sale.status} />
                </div>
              </div>
              
              {/* Product Details */}
              <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
                {/* Product Name */}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-semibold line-clamp-2 hover:text-gray-700 flex-1">
                    {product?.name || 'Unknown Product'}
                  </h2>
                </div>
                
                {/* Sale Number */}
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Sale #{sale.saleNumber}
                </div>
                
                {/* Price with unit */}
                <div className="flex items-center gap-2">
                  <div className="relative px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-black bg-pink-400 w-fit rounded">
                    <p className="text-base sm:text-lg font-bold">
                      {sale.totalAmount.toLocaleString()} RWF
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {sale.quantity} {product?.unit || 'unit'}(s)
                  </p>
                </div>
                
                {/* Customer Info */}
                <div className="flex flex-col gap-1.5 sm:gap-2 mt-auto">
                  <p className="text-xs sm:text-sm font-semibold truncate">
                    {sale.customerName}
                  </p>
                  
                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  
                  {/* Message Button */}
                  {sale.customerId && (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageCustomer(sale);
                      }} 
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                      disabled={startConversation.isPending}
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {startConversation.isPending ? "Starting..." : "Message Customer"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export const MySalesListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: any }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    shipped: { label: 'Shipped', variant: 'default' },
    delivered: { label: 'Delivered', variant: 'default' },
    completed: { label: 'Completed', variant: 'default' },
    refunded: { label: 'Refunded', variant: 'destructive' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  };

  const config = statusConfig[status] || { label: status, variant: 'secondary' };

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};
