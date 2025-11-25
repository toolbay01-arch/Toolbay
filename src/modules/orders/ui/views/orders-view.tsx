'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { Grid3x3, List, Package, MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// Order status badge matching verify-payments style
function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    shipped: { label: 'Shipped', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    delivered: { label: 'Delivered', className: 'bg-purple-100 text-purple-800 border-purple-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-300' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-300' },
  }

  const statusConfig = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.className}`}>
      {statusConfig.label}
    </span>
  )
}

// Loading state
function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading your orders...</p>
    </div>
  )
}

export function OrdersView() {
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Responsive view mode: list on mobile, grid on desktop by default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    setViewMode(isMobile ? 'list' : 'grid')
  }, [])

  // Fetch orders with auto-refresh support
  const { data, isLoading, refetch } = useQuery({
    ...trpc.orders.getMyOrders.queryOptions({
      limit: 50,
      page: 1,
    }),
    refetchInterval: autoRefresh ? 5000 : false,
  })

  // Get session for chat functionality
  const { data: session } = useQuery(trpc.auth.session.queryOptions())

  // Confirm receipt mutation
  const confirmReceiptMutation = useMutation(
    trpc.orders.confirmReceipt.mutationOptions({
      onSuccess: () => {
        toast.success('Receipt confirmed! Order marked as completed.')
        queryClient.invalidateQueries(trpc.orders.getMyOrders.queryFilter())
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to confirm receipt')
      },
    })
  )

  // Start conversation mutation
  const startConversation = useMutation(
    trpc.chat.startConversation.mutationOptions({
      onSuccess: (data) => {
        router.push(`/chat/${data.id}`)
        toast.success('Chat started with seller')
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to start chat')
      },
    })
  )

  const handleConfirmReceipt = (orderId: string) => {
    if (confirm('Confirm that you have received this order in good condition?')) {
      confirmReceiptMutation.mutate({ orderId })
    }
  }

  const handleMessageSeller = (order: any) => {
    if (!session?.user) {
      toast.error('Please log in to message the seller')
      router.push('/sign-in?redirect=/orders')
      return
    }

    if (!order.sellerUserId) {
      toast.error('Unable to contact seller. Please try again later.')
      return
    }

    if (order.sellerUserId === session.user.id) {
      toast.error('You cannot message yourself')
      return
    }

    // Build a rich initial message like the product page does
    const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/orders`
    const initialMessage = `Hello, I have a question about my order:\n\nOrder #${order.orderNumber}\nProduct: ${order.productName}\nAmount: ${(order.totalAmount || 0).toLocaleString()} RWF\n\nPlease contact me regarding this order.`

    startConversation.mutate({
      participantId: order.sellerUserId,
      orderId: order.id,
      initialMessage: initialMessage,
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 mt-6">
        <LoadingState />
      </div>
    )
  }

  const orders = data?.orders || []

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-gray-600">Track your purchases and delivery status</p>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-gray-600 mb-4">
            Your orders will appear here once you make a purchase.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-600">Track your purchases and delivery status</p>
      </div>

      <div className="space-y-4">
        {/* Header with count */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-1">
            All Orders ({orders.length})
          </h2>
          <p className="text-sm text-blue-700">
            Track your order status and confirm receipt when delivered
          </p>
        </div>

        {/* View & Auto-Refresh Toggle */}
        <div className="flex flex-wrap justify-end gap-2 pb-2">
          <button
            className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" /> Grid
          </button>
          <button
            className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" /> List
          </button>
          <button
            className={`gap-2 px-3 py-1 rounded border flex items-center ${autoRefresh ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
          </button>
        </div>

        {/* List View */}
        {viewMode === 'list' ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {order.productImage ? (
                            <img
                              src={order.productImage}
                              alt={order.productName}
                              className="w-12 h-12 object-cover rounded border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-gray-100 border border-gray-200 rounded">
                              <Package className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                            {order.productName}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-mono text-xs">#{order.orderNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-900">{order.storeName || 'Unknown Store'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.quantity}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {(order.totalAmount || 0).toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {/* Confirm Receipt for delivered orders */}
                          {order.status === 'delivered' && !order.received && (
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              disabled={confirmReceiptMutation.isPending}
                              className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                            >
                              {confirmReceiptMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                '✅ Confirm Receipt'
                              )}
                            </button>
                          )}
                          {/* Contact Seller */}
                          {order.sellerUserId && order.sellerUserId !== session?.user?.id && (
                            <button
                              onClick={() => handleMessageSeller(order)}
                              disabled={startConversation.isPending}
                              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-all hover:shadow-md flex items-center gap-1"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {startConversation.isPending ? 'Starting...' : 'Contact Seller'}
                            </button>
                          )}
                          {/* Status indicators */}
                          {order.status === 'pending' && (
                            <span className="text-xs text-yellow-600 font-medium">⏳ Awaiting shipment</span>
                          )}
                          {order.status === 'shipped' && (
                            <span className="text-xs text-blue-600 font-medium">🚚 On the way</span>
                          )}
                          {order.status === 'completed' && (
                            <span className="text-xs text-green-600 font-medium">✅ Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View - Compact cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className="hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all border border-blue-600 rounded-lg bg-white overflow-hidden flex flex-col"
              >
                {/* Product Image - Smaller */}
                {order.productImage ? (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    className="aspect-square w-full object-cover border-b border-blue-600"
                  />
                ) : (
                  <div className="aspect-square w-full flex items-center justify-center bg-gray-100 border-b border-blue-600">
                    <Package className="h-8 w-8 text-gray-300" />
                  </div>
                )}

                {/* Card Content - Compact */}
                <div className="p-2 flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="font-mono text-[10px] text-blue-700 truncate">#{order.orderNumber}</div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="font-medium text-sm text-gray-900 truncate">{order.productName}</div>
                  <div className="text-[10px] text-gray-500 truncate">{order.storeName || 'Unknown Store'}</div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-green-600 text-xs">
                      {(order.totalAmount || 0).toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-gray-500">x{order.quantity}</span>
                  </div>

                  {/* Action Buttons - Compact */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.status === 'delivered' && !order.received && (
                      <button
                        onClick={() => handleConfirmReceipt(order.id)}
                        disabled={confirmReceiptMutation.isPending}
                        className="px-2 py-0.5 text-[10px] font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                      >
                        {confirmReceiptMutation.isPending ? '...' : '✅ Confirm'}
                      </button>
                    )}
                    {order.sellerUserId && order.sellerUserId !== session?.user?.id && (
                      <button
                        onClick={() => handleMessageSeller(order)}
                        disabled={startConversation.isPending}
                        className="px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-all flex items-center gap-0.5"
                      >
                        <MessageCircle className="h-2.5 w-2.5" />
                        {startConversation.isPending ? '...' : 'Chat'}
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <span className="text-[10px] text-yellow-600 font-medium">⏳</span>
                    )}
                    {order.status === 'shipped' && (
                      <span className="text-[10px] text-blue-600 font-medium">🚚</span>
                    )}
                    {order.status === 'completed' && (
                      <span className="text-[10px] text-green-600 font-medium">✅</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
