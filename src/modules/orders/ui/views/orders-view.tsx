'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTRPC } from '@/trpc/client'
import { OrderCard } from '@/components/orders/OrderCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, PackageX, RefreshCw, Grid3x3, List, Package, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type OrderNotification = {
  id: string;
  type: 'shipped' | 'delivered';
  orderId: string;
  orderNumber: string;
  productName: string;
  message: string;
}

export function OrdersView() {
  const trpc = useTRPC()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'>('all')
  // Responsive view mode: list on mobile, grid on desktop by default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  // Auto-refresh toggle - ON by default
  const [autoRefresh, setAutoRefresh] = useState(true)
  // Track if we've already refetched for payment redirect
  const hasRefetchedRef = useRef(false)
  const latestOrderRef = useRef<HTMLDivElement>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Dismissed notifications tracking
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dismissedOrderNotifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Save dismissed notifications to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissedOrderNotifications', JSON.stringify([...dismissedNotifications]));
    }
  }, [dismissedNotifications]);

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

  // Check if redirected from payment submission
  const fromPayment = searchParams.get('from') === 'payment'

  // Auto-refetch when redirected from payment
  useEffect(() => {
    if (fromPayment && isAuthenticated && !hasRefetchedRef.current) {
      hasRefetchedRef.current = true
      
      // Show loading toast
      const refetchToast = toast.loading('Loading your latest order...')
      
      // Refetch orders to get the latest one
      refetch().then(() => {
        toast.dismiss(refetchToast)
        toast.success('Latest order loaded!', { duration: 2000 })
        
        // Scroll to latest order after a brief delay
        setTimeout(() => {
          latestOrderRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 300)
      }).catch(() => {
        toast.dismiss(refetchToast)
      })

      // Clean up URL parameter
      const params = new URLSearchParams(searchParams.toString())
      params.delete('from')
      router.replace(`/orders${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    }
  }, [fromPayment, isAuthenticated, refetch, searchParams, router])

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

  // Generate notifications from orders
  const orders = data?.orders || []
  const notifications: OrderNotification[] = [];

  orders.forEach((order: any) => {
    // Shipped notification - order has been shipped
    if (order.status === 'shipped') {
      const productName = typeof order.product === 'string' 
        ? order.product 
        : order.product?.name || 'Unknown Product';
      
      notifications.push({
        id: `shipped-${order.id}`,
        type: 'shipped',
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        productName,
        message: `Order ${order.orderNumber || order.id.slice(0, 8)} has been shipped`,
      });
    }

    // Delivered notification - order delivered, waiting for confirmation
    if (order.status === 'delivered') {
      const productName = typeof order.product === 'string' 
        ? order.product 
        : order.product?.name || 'Unknown Product';
      
      notifications.push({
        id: `delivered-${order.id}`,
        type: 'delivered',
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        productName,
        message: `Order ${order.orderNumber || order.id.slice(0, 8)} has been delivered - Please confirm receipt`,
      });
    }
  });

  // Filter out dismissed notifications
  const activeNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));

  // Limit notifications shown based on screen size
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const visibleNotifications = activeNotifications.slice(0, isMobile ? 2 : 5);

  const handleDismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const handleNotificationClick = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  // Auto-scroll to selected order from notification
  useEffect(() => {
    if (selectedOrderId) {
      setTimeout(() => {
        const element = document.getElementById(`order-${selectedOrderId}`);
        if (element) {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          
          if (isMobile) {
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            
            window.scrollTo({
              top: y,
              behavior: 'smooth'
            });
          } else {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
          
          // Add visual feedback
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 2000);
        }
      }, 200);
      
      setSelectedOrderId(null);
    }
  }, [selectedOrderId]);

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

  return (
    <div className="space-y-4">
      {/* Notifications Section */}
      {visibleNotifications.length > 0 && (
        <div className="space-y-1.5">
          {visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                notification.type === 'shipped' 
                  ? "bg-blue-50 border border-blue-200 hover:bg-blue-100" 
                  : "bg-amber-50 border border-amber-200 hover:bg-amber-100"
              )}
              onClick={() => handleNotificationClick(notification.orderId)}
            >
              {notification.type === 'shipped' ? (
                <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              )}
              <span className={cn(
                "flex-1 text-sm font-medium truncate",
                notification.type === 'shipped' ? "text-blue-800" : "text-amber-800"
              )}>
                {notification.message}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismissNotification(notification.id);
                }}
                className={cn(
                  "p-1 rounded-full transition-colors flex-shrink-0",
                  notification.type === 'shipped' 
                    ? "hover:bg-blue-200 text-blue-600" 
                    : "hover:bg-amber-200 text-amber-600"
                )}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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
                {orders.map((order: any, index: number) => (
                  <div 
                    key={order.id}
                    id={`order-${order.id}`}
                    ref={index === 0 ? latestOrderRef : null}
                    className={cn(
                      "transition-all duration-300",
                      index === 0 && fromPayment && "ring-2 ring-green-500 ring-opacity-50 bg-green-50"
                    )}
                  >
                    <OrderCard
                      order={order}
                      onConfirmReceiptAction={handleConfirmReceipt}
                    />
                  </div>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order: any, index: number) => (
            <div 
              key={order.id}
              id={`order-${order.id}`}
              ref={index === 0 ? latestOrderRef : null}
              className={cn(
                "transition-all duration-300",
                index === 0 && fromPayment && "ring-2 ring-green-500 rounded-lg"
              )}
            >
              <OrderCard
                order={order}
                onConfirmReceiptAction={handleConfirmReceipt}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
