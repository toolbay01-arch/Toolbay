'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OrderStatusBadge } from './OrderStatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, MessageCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useTRPC } from '@/trpc/client'

interface OrderCardProps {
  order: {
    id: string
    orderNumber: string
    status: 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
    totalAmount: number
    createdAt: string
    received?: boolean
    sellerUserId?: string | null
    storeName?: string | null
    // New flattened fields from API
    productImage?: string | null
    productName?: string | null
    quantity?: number
    // Legacy support
    products?: Array<{
      id: string
      title: string
      priceAtPurchase: number
      quantity: number
      image?: string | null
    }>
  }
  onConfirmReceiptAction: (orderId: string) => Promise<void>
}

export function OrderCard({ order, onConfirmReceiptAction }: OrderCardProps) {
  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { data: session } = useQuery(trpc.auth.session.queryOptions())
  
  const startConversation = useMutation(trpc.chat.startConversation.mutationOptions({
    onSuccess: (data) => {
      router.push(`/chat/${data.id}`)
      toast.success('Chat started with seller')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start chat')
    },
  }))
  
  const handleMessageSeller = () => {
    if (!session?.user) {
      toast.error('Please log in to message the seller')
      router.push('/sign-in?redirect=/orders')
      return
    }
    
    if (!order.sellerUserId) {
      toast.error('Unable to contact seller')
      return
    }
    
    if (order.sellerUserId === session.user.id) {
      toast.error('You cannot message yourself')
      return
    }
    
    const productName = order.productName || order.products?.[0]?.title || 'your order'
    
    startConversation.mutate({
      participantId: order.sellerUserId,
      orderId: order.id,
      initialMessage: `Hi, I have a question about ${productName} (Order #${order.orderNumber})`,
    })
  }

  // Use new flattened fields or fallback to legacy
  const imageSrc = order.productImage || order.products?.[0]?.image
  const productTitle = order.productName || order.products?.[0]?.title || 'Unknown Product'
  const quantity = order.quantity || order.products?.[0]?.quantity || 1

  const canConfirmReceipt = order.status === 'delivered' && !order.received

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={productTitle}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0">
              <Package className="h-8 w-8 text-gray-300" />
            </div>
          )}

          {/* Order Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{productTitle}</p>
                <p className="text-xs text-gray-500 font-mono">#{order.orderNumber}</p>
                {order.storeName && (
                  <p className="text-xs text-gray-500">from {order.storeName}</p>
                )}
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-600">
                  {(order.totalAmount || 0).toLocaleString()} RWF
                </p>
                <p className="text-xs text-gray-500">
                  Qty: {quantity} • {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Confirm Receipt */}
                {canConfirmReceipt && (
                  <Button
                    onClick={() => {
                      if (confirm('Confirm that you have received this order?')) {
                        onConfirmReceiptAction(order.id)
                      }
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                )}

                {/* Message Seller */}
                {order.sellerUserId && order.sellerUserId !== session?.user?.id && (
                  <Button
                    onClick={handleMessageSeller}
                    disabled={startConversation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {startConversation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Status Indicators */}
            {order.status === 'pending' && (
              <p className="text-xs text-yellow-600 mt-2">⏳ Awaiting shipment</p>
            )}
            {order.status === 'shipped' && (
              <p className="text-xs text-blue-600 mt-2">🚚 On the way</p>
            )}
            {order.status === 'completed' && (
              <p className="text-xs text-green-600 mt-2">✅ Order completed</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
