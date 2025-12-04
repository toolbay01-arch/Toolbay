'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTRPC } from '@/trpc/client'
import { OrderCard } from '@/components/orders/OrderCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, PackageX, RefreshCw, Grid3x3, List } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function OrdersView() {
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'>('all')
  // Responsive view mode: list on mobile, grid on desktop by default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  // Auto-refresh toggle
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Check session first - refetch on mount and window focus to catch logouts from other tabs
  const sessionQuery = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always check fresh
  });
  const isAuthenticated = !!sessionQuery.data?.user;

  useEffect(() => {
    // Set initial view based on screen size
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? 'list' : 'grid');
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionQuery.isFetched && !sessionQuery.data?.user) {
      router.push('/sign-in?redirect=/orders');
    }
  }, [sessionQuery.isFetched, sessionQuery.data?.user, router]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    ...trpc.orders.getMyOrders.queryOptions({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 20,
      page: 1,
    }),
    refetchInterval: autoRefresh ? 5000 : false,
    enabled: isAuthenticated, // Only fetch if authenticated
  });

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

  // Show loading while checking session or fetching orders
  if (sessionQuery.isLoading || !sessionQuery.isFetched || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If not authenticated, show loading while redirect happens
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const orders = data?.orders || []

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-900 mb-1">
          All Orders ({orders.length})
        </h2>
        <p className="text-sm text-green-700">
          View and manage order fulfillment and delivery status
        </p>
      </div>

      {/* View & Auto-Refresh Toggle */}
      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <Button
          className={`gap-2 px-3 py-1 rounded border ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" /> Grid
        </Button>
        <Button
          className={`gap-2 px-3 py-1 rounded border ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" /> List
        </Button>
        <Button
          className={`gap-2 px-3 py-1 rounded border ${autoRefresh ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
        </Button>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onConfirmReceiptAction={handleConfirmReceipt}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onConfirmReceiptAction={handleConfirmReceipt}
            />
          ))}
        </div>
      )}
    </div>
  )
}
