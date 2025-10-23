'use client'

import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react'

interface OrderStatusBadgeProps {
  status: 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    shipped: {
      label: 'Shipped',
      icon: Truck,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    delivered: {
      label: 'Delivered',
      icon: Package,
      className: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${config.className}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </div>
  )
}
