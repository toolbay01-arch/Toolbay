'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { OrderStats } from '@/components/dashboard/OrderStats'
import { OrderCard } from '@/components/orders/OrderCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  ShoppingBag, 
  User, 
  ArrowRight,
  Loader2
} from 'lucide-react'

export function DashboardView() {
  const trpc = useTRPC()

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading } = useQuery(
    trpc.orders.getDashboardStats.queryOptions()
  )

  // Fetch recent orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    trpc.orders.getMyOrders.queryOptions({
      limit: 5,
      page: 1,
    })
  )

  const handleConfirmReceipt = async (orderId: string) => {
    // This will be handled by the OrderCard component
    console.log('Confirm receipt:', orderId)
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = statsData ?? {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  }

  const recentOrders = ordersData?.orders ?? []

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Statistics Cards */}
      <OrderStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Orders</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start shopping to see your orders here
                </p>
                <Button asChild>
                  <Link href="/">Browse Products</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onConfirmReceiptAction={handleConfirmReceipt}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Quick Actions</h2>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Shopping
              </CardTitle>
              <CardDescription>Browse and purchase products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="default" asChild>
                <Link href="/">
                  Browse All Products
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/orders">
                  View My Orders
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>Manage your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/admin">
                  Account Settings
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Status
              </CardTitle>
              <CardDescription>Track your purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold">{stats.pendingOrders}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-semibold">{stats.completedOrders}</span>
                </div>
                <Separator />
                <Button className="w-full mt-4" variant="outline" size="sm" asChild>
                  <Link href="/orders">
                    View All Orders
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
