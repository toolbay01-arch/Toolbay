'use client'

import { format } from 'date-fns'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ConfirmReceiptButton } from './ConfirmReceiptButton'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Package, Calendar, DollarSign, MapPin } from 'lucide-react'

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
}

export function OrderCard({ order, onConfirmReceiptAction }: OrderCardProps) {
  const canConfirmReceipt = order.status === 'delivered' && !order.received

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

      {canConfirmReceipt && (
        <CardFooter className="bg-muted/30 border-t pt-4">
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground">
              Have you received your order? Confirm receipt to complete this order.
            </p>
            <ConfirmReceiptButton 
              orderId={order.id} 
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
