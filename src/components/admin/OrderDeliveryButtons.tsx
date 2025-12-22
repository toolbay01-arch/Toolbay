'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Package, Truck, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OrderDeliveryButtonsProps {
  orderId: string
  currentStatus: 'pending' | 'shipped' | 'delivered' | 'completed' | 'refunded' | 'cancelled'
  onStatusUpdateAction: () => void
}

export const OrderDeliveryButtons: React.FC<OrderDeliveryButtonsProps> = ({
  orderId,
  currentStatus,
  onStatusUpdateAction,
}) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateOrderStatus = async (newStatus: 'shipped' | 'delivered') => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'shipped' && { shippedAt: new Date().toISOString() }),
          ...(newStatus === 'delivered' && { deliveredAt: new Date().toISOString() }),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update order status')
      }

      toast.success(
        newStatus === 'shipped'
          ? '📦 Order marked as shipped!'
          : '✅ Order marked as delivered!'
      )
      onStatusUpdateAction()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update order status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'refunded') {
    return null
  }

  return (
    <div className="flex gap-2">
      {currentStatus === 'pending' && (
        <Button
          onClick={() => updateOrderStatus('shipped')}
          disabled={isUpdating}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Truck className="h-4 w-4" />
          )}
          Mark as Shipped
        </Button>
      )}

      {currentStatus === 'shipped' && (
        <Button
          onClick={() => updateOrderStatus('delivered')}
          disabled={isUpdating}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          Mark as Delivered
        </Button>
      )}

      {currentStatus === 'delivered' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Awaiting Customer Confirmation
        </div>
      )}
    </div>
  )
}
