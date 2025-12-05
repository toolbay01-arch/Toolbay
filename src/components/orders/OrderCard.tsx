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
    deliveryType?: 'direct' | 'delivery'
    shippingAddress?: {
      line1?: string
      city?: string
      country?: string
    }
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
      router.push('/')
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
    
    const productName = order.productName || order.products?.[0]?.title || 'your order'
    
    // Build a rich initial message like the product page does
    const initialMessage = `Hello, I have a question about my order:\n\nOrder #${order.orderNumber}\nProduct: ${productName}\nAmount: ${(order.totalAmount || 0).toLocaleString()} RWF\n\nPlease contact me regarding this order.`
    
    startConversation.mutate({
      participantId: order.sellerUserId,
      orderId: order.id,
      initialMessage: initialMessage,
    })
  }

  // Use new flattened fields or fallback to legacy
  const imageSrc = order.productImage || order.products?.[0]?.image
  const productTitle = order.productName || order.products?.[0]?.title || 'Unknown Product'
  const quantity = order.quantity || order.products?.[0]?.quantity || 1
  const deliveryType = order.deliveryType || 'delivery' // Default to delivery for backward compatibility

  // Determine if receipt can be confirmed based on delivery type
  const canConfirmReceipt = deliveryType === 'direct' 
    ? order.status === 'pending' && !order.received // Direct orders can confirm from pending
    : order.status === 'delivered' && !order.received // Delivery orders must be delivered

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
                {deliveryType && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${
                    deliveryType === 'direct' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {deliveryType === 'direct' ? '📦 Pickup' : '🚚 Delivery'}
                  </span>
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
                {/* Confirm Receipt/Pickup */}
                {canConfirmReceipt && (
                  <Button
                    onClick={() => {
                      const message = deliveryType === 'direct'
                        ? 'Confirm that you have picked up this order?'
                        : 'Confirm that you have received this order?'
                      if (confirm(message)) {
                        onConfirmReceiptAction(order.id)
                      }
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {deliveryType === 'direct' ? 'Confirm Pickup' : 'Confirm Receipt'}
                  </Button>
                )}

                {/* Contact Seller */}
                {order.sellerUserId && order.sellerUserId !== session?.user?.id && (
                  <Button
                    onClick={handleMessageSeller}
                    disabled={startConversation.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {startConversation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Contact Seller
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Shipping Address for Delivery Orders */}
            {order.deliveryType === 'delivery' && order.shippingAddress && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                <div className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Shipping to:
                </div>
                <div className="text-xs text-blue-800">
                  {order.shippingAddress.line1}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.country}
                </div>
              </div>
            )}

            {/* Status Indicators */}
            {order.status === 'pending' && (
              <p className="text-xs text-yellow-600 mt-2">
                {deliveryType === 'direct' ? '✅ Ready for pickup' : '⏳ Awaiting shipment'}
              </p>
            )}
            {order.status === 'shipped' && deliveryType === 'delivery' && (
              <p className="text-xs text-blue-600 mt-2">🚚 On the way</p>
            )}
            {order.status === 'delivered' && deliveryType === 'delivery' && (
              <p className="text-xs text-purple-600 mt-2">📦 Delivered - Please confirm receipt</p>
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
