"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Package, CheckCircle } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  const statCards = [
    {
      title: "Total Sales",
      value: stats.totalSales.toLocaleString(),
      icon: Package,
      description: "All-time orders",
      color: "text-blue-600",
    },
    {
      title: "Net Revenue",
      value: `${stats.totalRevenue.toLocaleString()} RWF`,
      icon: DollarSign,
      description: "After platform fees",
      color: "text-green-600",
    },
    {
      title: "Gross Revenue",
      value: `${stats.totalGrossRevenue.toLocaleString()} RWF`,
      icon: TrendingUp,
      description: "Total before fees",
      color: "text-purple-600",
    },
    {
      title: "Completed",
      value: stats.statusCounts.completed.toLocaleString(),
      icon: CheckCircle,
      description: "Confirmed deliveries",
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index}>
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
