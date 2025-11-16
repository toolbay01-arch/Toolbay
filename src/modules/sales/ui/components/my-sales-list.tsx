"use client";

import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageIcon, TrendingUp, DollarSign, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MySalesListProps {
  searchQuery?: string;
  statusFilter?: string | null;
}

export const MySalesList = ({ searchQuery, statusFilter }: MySalesListProps) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  
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
      router.push("/sign-in");
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
      {/* Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sales.map((sale) => {
          const product = typeof sale.product === 'object' ? sale.product : null;
          const productImage = product && typeof product.image === 'object' ? product.image : null;

          return (
            <Card key={sale.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-gray-100">
                {productImage?.url ? (
                  <img
                    src={productImage.url}
                    alt={product?.name || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PackageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={sale.status} />
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">
                      {product?.name || 'Unknown Product'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Sale #{sale.saleNumber}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium line-clamp-1">{sale.customerName}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{sale.quantity} {product?.unit || 'unit'}(s)</span>
                  </div>

                  <div className="pt-2 border-t space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Gross:</span>
                      <span className="font-medium">{sale.totalAmount.toLocaleString()} RWF</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-red-600">
                      <span>Platform Fee (10%):</span>
                      <span>-{sale.platformFee.toLocaleString()} RWF</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-green-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Net Amount:
                      </span>
                      <span>{sale.netAmount.toLocaleString()} RWF</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  
                  {sale.customerId && (
                    <div className="pt-2">
                      <Button 
                        onClick={() => handleMessageCustomer(sale)} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={startConversation.isPending}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {startConversation.isPending ? "Starting chat..." : "Message Customer"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
