'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { OrderCard } from '@/components/orders/OrderCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, PackageX, RefreshCw, Grid3x3, List } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function OrdersView() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'>('all')
  
  // Responsive view mode: list on mobile, grid on desktop by default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  useEffect(() => {
    // Set initial view based on screen size
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? 'list' : 'grid');
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery(trpc.orders.getMyOrders.queryOptions({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 20,
    page: 1,
  }))

  const confirmReceiptMutation = useMutation(trpc.orders.confirmReceipt.mutationOptions({
    onSuccess: () => {
      toast.success('Receipt confirmed! Order marked as completed.')
      queryClient.invalidateQueries(trpc.orders.getMyOrders.queryFilter())
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm receipt')
    },
  }))

  const handleConfirmReceipt = async (orderId: string) => {
    await confirmReceiptMutation.mutateAsync({ orderId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const orders = data?.orders || []

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track your order status and confirm receipt
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <PackageX className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No orders found</h3>
              <p className="text-muted-foreground mt-2">
                {statusFilter === 'all' 
                  ? "You haven't placed any orders yet."
                  : `You don't have any ${statusFilter} orders.`
                }
              </p>
            </div>
          ) : (
            <>
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

              {/* Orders Display */}
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                  : "space-y-4"
              )}>
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    order={order as any}
                    onConfirmReceiptAction={handleConfirmReceipt}
                    viewMode={viewMode}
                  />
                ))}
              </div>
              
              {/* Pagination Info */}
              {data?.pagination && (
                <div className="text-center text-sm text-muted-foreground pt-4">
                  Showing {orders.length} of {data.pagination.totalDocs} orders
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
