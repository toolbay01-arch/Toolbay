"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Package, CheckCircle, Clock, Truck, PackageCheck, XCircle, RotateCcw } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const SalesStats = () => {
  const trpc = useTRPC();
  
  const { data: stats, isLoading } = useQuery(
    trpc.sales.getSalesStats.queryOptions()
  );

  if (isLoading) {
    return <SalesStatsSkeleton />;
  }

  if (!stats) {
    return null;
  }

  const mainStatCards = [
    {
      title: "Total Sales",
      value: stats.totalSales.toLocaleString(),
      icon: Package,
      description: "All-time orders",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: `${stats.totalRevenue.toLocaleString()} RWF`,
      icon: DollarSign,
      description: "Total earnings (100%)",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Gross Revenue",
      value: `${stats.totalGrossRevenue.toLocaleString()} RWF`,
      icon: TrendingUp,
      description: "Total before any deductions",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Average Sale",
      value: `${Math.round(stats.averageSaleAmount).toLocaleString()} RWF`,
      icon: TrendingUp,
      description: "Average per order",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  const statusBreakdown = [
    {
      label: "Pending",
      count: stats.statusCounts.pending,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    {
      label: "Shipped",
      count: stats.statusCounts.shipped,
      icon: Truck,
      color: "bg-blue-100 text-blue-800 border-blue-300",
    },
    {
      label: "Delivered",
      count: stats.statusCounts.delivered,
      icon: PackageCheck,
      color: "bg-purple-100 text-purple-800 border-purple-300",
    },
    {
      label: "Completed",
      count: stats.statusCounts.completed,
      icon: CheckCircle,
      color: "bg-green-100 text-green-800 border-green-300",
    },
    {
      label: "Refunded",
      count: stats.statusCounts.refunded,
      icon: RotateCcw,
      color: "bg-orange-100 text-orange-800 border-orange-300",
    },
    {
      label: "Cancelled",
      count: stats.statusCounts.cancelled,
      icon: XCircle,
      color: "bg-red-100 text-red-800 border-red-300",
    },
  ];

  // Verify totals match
  const statusTotal = Object.values(stats.statusCounts).reduce((sum, count) => sum + count, 0);
  const totalsMismatch = statusTotal !== stats.totalSales;

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats - Commented out as requested */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStatCards.map((stat, index) => (
          <Card key={index} className={stat.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div> */}

      {/* Status Breakdown - Commented out as requested */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Sales by Status</span>
            {totalsMismatch && (
              <Badge variant="destructive" className="text-xs">
                Sync Issue Detected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusBreakdown.map((status, index) => (
              <div key={index} className={`flex flex-col items-center justify-center p-4 rounded-lg border ${status.color}`}>
                <status.icon className="h-5 w-5 mb-2" />
                <div className="text-2xl font-bold">{status.count}</div>
                <div className="text-xs font-medium mt-1">{status.label}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Status Total: <strong>{statusTotal}</strong>
            </span>
            <span className={totalsMismatch ? "text-red-600 font-semibold" : "text-green-600"}>
              {totalsMismatch ? `⚠️ Mismatch with Total Sales (${stats.totalSales})` : '✓ Totals Match'}
            </span>
          </div>
        </CardContent>
      </Card> */}

      {/* Total Sales & Success Rate - Compact, side by side on all screens */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 py-2 sm:py-3">
          <CardHeader className="pb-0 pt-0 px-3 sm:px-4 gap-0">
            <CardTitle className="text-xs sm:text-sm">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="pb-0 pt-0.5 px-3 sm:px-4">
            <div className="text-base sm:text-xl font-bold text-blue-600">
              {stats.totalSales}
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              All orders
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 py-2 sm:py-3">
          <CardHeader className="pb-0 pt-0 px-3 sm:px-4 gap-0">
            <CardTitle className="text-xs sm:text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="pb-0 pt-0.5 px-3 sm:px-4">
            <div className="text-base sm:text-xl font-bold text-green-600">
              {stats.totalSales > 0 
                ? Math.round((stats.statusCounts.completed / stats.totalSales) * 100)
                : 0}%
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              {stats.statusCounts.completed} completed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const SalesStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
