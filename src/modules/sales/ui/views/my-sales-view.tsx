"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, Loader2, TrendingUp } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { MySalesList, MySalesListSkeleton } from "../components/my-sales-list";
import { SalesStats } from "../components/sales-stats";

export const MySalesView = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Check authentication and tenant status
  const { data: session, isLoading: sessionLoading } = useQuery(
    trpc.auth.session.queryOptions()
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in");
    } else if (!sessionLoading && session?.user && !session.user.roles?.includes('tenant')) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || !session.user.roles?.includes('tenant')) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">My Sales</h1>
              <p className="text-gray-600 mt-1">
                Track your sales and revenue
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <Suspense fallback={<div className="h-32 mb-8" />}>
          <SalesStats />
        </Suspense>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by sale number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales Grid */}
        <Suspense fallback={<MySalesListSkeleton />}>
          <MySalesList 
            searchQuery={debouncedSearch}
            statusFilter={statusFilter}
          />
        </Suspense>
      </div>
    </div>
  );
};
