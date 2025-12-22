'use client'

import React from 'react'
import { OrderDeliveryButtons } from './OrderDeliveryButtons'

interface CellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rowData: any
}

export const OrderStatusCell: React.FC<CellProps> = (props) => {
  const { rowData } = props
  const orderId = rowData.id
  const status = rowData.status as 'pending' | 'shipped' | 'delivered' | 'completed' | 'refunded' | 'cancelled'
  const received = rowData.received as boolean | undefined
  const getStatusBadge = () => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⏳',
      },
      shipped: {
        label: 'Shipped',
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '📦',
      },
      delivered: {
        label: 'Delivered',
        className: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: '🚚',
      },
      completed: {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅',
      },
      refunded: {
        label: 'Refunded',
        className: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: '🔄',
      },
      cancelled: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 border-red-300',
        icon: '❌',
      },
    }

    const config = statusConfig[status]

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {status === 'completed' && received && (
          <span className="ml-1" title="Customer confirmed receipt">
            (Confirmed)
          </span>
        )}
      </span>
    )
  }

  const handleStatusUpdate = () => {
    // Trigger a page refresh to update the list
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-2">
      {getStatusBadge()}
      <OrderDeliveryButtons
        orderId={orderId}
        currentStatus={status}
        onStatusUpdateAction={handleStatusUpdate}
      />
    </div>
  )
}
