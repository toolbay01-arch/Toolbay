'use client'

import { Package, ShoppingBag, TrendingUp, Clock } from 'lucide-react'
import { StatCard } from './StatCard'

interface OrderStatsProps {
  stats: {
    totalOrders: number
    pendingOrders: number
    completedOrders: number
    totalSpent: number
  }
}

export function OrderStats({ stats }: OrderStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Orders"
        value={stats.totalOrders}
        description="All time orders"
        icon={ShoppingBag}
      />
      <StatCard
        title="Pending Orders"
        value={stats.pendingOrders}
        description="Awaiting shipment"
        icon={Clock}
      />
      <StatCard
        title="Completed"
        value={stats.completedOrders}
        description="Successfully delivered"
        icon={Package}
      />
      <StatCard
        title="Total Spent"
        value={`${stats.totalSpent.toLocaleString()} RWF`}
        description="Total purchases"
        icon={TrendingUp}
      />
    </div>
  )
}
