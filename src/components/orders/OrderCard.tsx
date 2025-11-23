'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ConfirmReceiptButton } from './ConfirmReceiptButton'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Package, Calendar, DollarSign, MapPin, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useTRPC } from '@/trpc/client'

interface OrderCardProps {
  order: {
    id: string
    orderNumber: string
    status: 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
    totalAmount: number
    createdAt: string
    confirmedAt?: string
    shippedAt?: string
    deliveredAt?: string
    received?: boolean
    sellerUserId?: string | null
    products?: Array<{
      id: string
      title: string
      priceAtPurchase: number
      quantity: number
    }>
    transaction?: {
      id: string
      paymentReference: string
      shippingAddress?: {
        line1: string
        city: string
        country: string
      }
    }
  }
  onConfirmReceiptAction: (orderId: string) => Promise<void>
  viewMode?: 'grid' | 'list'
}

export function OrderCard({ order, onConfirmReceiptAction, viewMode = 'grid' }: OrderCardProps) {
  const router = useRouter()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const canConfirmReceipt = order.status === 'delivered' && !order.received
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: session } = useQuery(trpc.auth.session.queryOptions())
  
  const startConversation = useMutation(trpc.chat.startConversation.mutationOptions({
    onSuccess: (data) => {
      // Just navigate immediately - the page will fetch fresh data with messages included
      router.push(`/chat/${data.id}`);
      toast.success("Chat started with seller");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start chat");
    },
  }));
  
  const handleMessageSeller = () => {
    if (!session?.user) {
      toast.error("Please log in to message the seller")
      router.push("/sign-in?redirect=/orders")
      return
    }
    
    if (!order.sellerUserId) {
      toast.error("Unable to contact seller")
      return
    }
    
    // Don't allow messaging yourself
    if (order.sellerUserId === session.user.id) {
      toast.error("You cannot message yourself")
      return
    }
    
    const productName = order.products?.[0]?.title || "your order"
    
    startConversation.mutate({
      participantId: order.sellerUserId,
      orderId: order.id,
      initialMessage: `Hi, I have a question about ${productName} (Order #${order.orderNumber})`,
    })
  }

  // List view with collapsible details
  if (viewMode === 'list') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-base font-semibold">Order #{order.orderNumber}</h3>
                <OrderStatusBadge status={order.status} />
              </div>
              
              {/* Essential Info - Always Visible */}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(order.createdAt), 'MMM dd, yyyy - HH:mm')}
                </div>
                
                {/* First Product Name */}
                {order.products && order.products.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{order.products[0]?.title || 'Product'}</p>
                      {order.products.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          +{order.products.length - 1} more item{order.products.length - 1 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Total Amount - Always Visible */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t">
            <span className="text-sm font-semibold text-green-700">Total:</span>
            <span className="text-lg font-bold text-green-700">
              {(order.totalAmount || 0).toLocaleString()} RWF
            </span>
          </div>
        </CardHeader>

        {/* Expandable Details */}
        {isExpanded && (
          <CardContent className="space-y-4 pt-0 border-t">
            {/* Products List */}
            {order.products && order.products.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items
                </h4>
                <div className="space-y-2">
                  {order.products.map((product) => (
                    <div key={product.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                      <span>{product.title}</span>
                      <span className="text-muted-foreground">
                        {product.quantity}x @ {product.priceAtPurchase.toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Address */}
            {order.transaction?.shippingAddress && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {order.transaction.shippingAddress.line1}
                  <br />
                  {order.transaction.shippingAddress.city}, {order.transaction.shippingAddress.country}
                </p>
              </div>
            )}

            {/* Order Timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Order Timeline</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={order.status !== 'pending' ? 'text-green-600' : 'text-muted-foreground'}>
                    {order.status !== 'pending' ? '✓' : '○'} Order Placed
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={order.status === 'shipped' || order.status === 'delivered' || order.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                    {order.shippedAt ? '✓' : '○'} Shipped
                  </span>
                  {order.shippedAt && (
                    <span className="text-muted-foreground">
                      {format(new Date(order.shippedAt), 'MMM dd, HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className={order.status === 'delivered' || order.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                    {order.deliveredAt ? '✓' : '○'} Delivered
                  </span>
                  {order.deliveredAt && (
                    <span className="text-muted-foreground">
                      {format(new Date(order.deliveredAt), 'MMM dd, HH:mm')}
                    </span>
                  )}
                </div>
                {order.received && (
                  <div className="flex justify-between">
                    <span className="text-green-600">✓ Receipt Confirmed</span>
                    <span className="text-muted-foreground">
                      {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Reference */}
            {order.transaction?.paymentReference && (
              <div className="text-sm bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground">Payment Reference: </span>
                <span className="font-mono">{order.transaction.paymentReference}</span>
              </div>
            )}
          </CardContent>
        )}

        {/* Action Buttons - Always Visible */}
        <CardFooter className="border-t pt-3 pb-3 flex-col gap-2">
          {/* Message Seller Button */}
          {order.sellerUserId && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleMessageSeller}
              disabled={startConversation.isPending}
              size="sm"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {startConversation.isPending ? "Starting chat..." : "Message Seller"}
            </Button>
          )}

          {/* Confirm Receipt */}
          {canConfirmReceipt && (
            <div className="w-full space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Have you received your order?
              </p>
              <ConfirmReceiptButton 
                onConfirmAction={() => onConfirmReceiptAction(order.id)}
              />
            </div>
          )}

          {/* Status Messages */}
          {!canConfirmReceipt && (order.status === 'pending' || order.status === 'shipped') && (
            <p className="text-xs text-muted-foreground text-center w-full">
              {order.status === 'pending' 
                ? '⏳ Your order is being processed.'
                : '📦 Your order has been shipped.'}
            </p>
          )}
        </CardFooter>
      </Card>
    );
  }

  // Grid view - Full details visible
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(order.createdAt), 'MMM dd, yyyy - HH:mm')}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Products */}
        {order.products && order.products.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items
            </h4>
            <div className="space-y-2">
              {order.products.map((product) => (
                <div key={product.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                  <span>{product.title}</span>
                  <span className="text-muted-foreground">
                    {product.quantity}x @ {product.priceAtPurchase.toLocaleString()} RWF
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Total Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Amount
          </span>
          <span className="text-lg font-bold">{(order.totalAmount || 0).toLocaleString()} RWF</span>
        </div>

        {/* Shipping Address */}
        {order.transaction?.shippingAddress && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </h4>
              <p className="text-sm text-muted-foreground">
                {order.transaction.shippingAddress.line1}
                <br />
                {order.transaction.shippingAddress.city}, {order.transaction.shippingAddress.country}
              </p>
            </div>
          </>
        )}

        {/* Order Timeline */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Order Timeline</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className={order.status !== 'pending' ? 'text-green-600' : 'text-muted-foreground'}>
                {order.status !== 'pending' ? '✓' : '○'} Order Placed
              </span>
              <span className="text-muted-foreground">
                {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={order.status === 'shipped' || order.status === 'delivered' || order.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                {order.shippedAt ? '✓' : '○'} Shipped
              </span>
              {order.shippedAt && (
                <span className="text-muted-foreground">
                  {format(new Date(order.shippedAt), 'MMM dd, HH:mm')}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className={order.status === 'delivered' || order.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}>
                {order.deliveredAt ? '✓' : '○'} Delivered
              </span>
              {order.deliveredAt && (
                <span className="text-muted-foreground">
                  {format(new Date(order.deliveredAt), 'MMM dd, HH:mm')}
                </span>
              )}
            </div>
            {order.received && (
              <div className="flex justify-between">
                <span className="text-green-600">✓ Receipt Confirmed</span>
                <span className="text-muted-foreground">
                  {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Reference */}
        {order.transaction?.paymentReference && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Payment Reference: </span>
              <span className="font-mono">{order.transaction.paymentReference}</span>
            </div>
          </>
        )}
      </CardContent>

      {/* Message Seller Button - Show for all orders */}
      {order.sellerUserId && (
        <CardFooter className="border-t pt-4 pb-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleMessageSeller}
            disabled={startConversation.isPending}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {startConversation.isPending ? "Starting chat..." : "Message Seller"}
          </Button>
        </CardFooter>
      )}

      {canConfirmReceipt && (
        <CardFooter className="bg-muted/30 border-t pt-4">
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground">
              Have you received your order? Confirm receipt to complete this order.
            </p>
            <ConfirmReceiptButton 
              onConfirmAction={() => onConfirmReceiptAction(order.id)}
            />
          </div>
        </CardFooter>
      )}

      {/* Show message for pending/shipped orders */}
      {(order.status === 'pending' || order.status === 'shipped') && !canConfirmReceipt && (
        <CardFooter className="bg-muted/30 border-t pt-4">
          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center">
              {order.status === 'pending' 
                ? '⏳ Your order is being processed. You will be able to confirm receipt once it has been delivered.'
                : '📦 Your order has been shipped. You will be able to confirm receipt once it has been delivered.'}
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
