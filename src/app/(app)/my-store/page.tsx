"use client";

import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, ShoppingBag, Package, TrendingUp, Loader2, Grid3x3, List } from 'lucide-react';

import { OrderStats } from '@/components/dashboard/OrderStats';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { MyProductsList, MyProductsListSkeleton } from '@/modules/dashboard/ui/components/my-products-list';
import { MySalesList, MySalesListSkeleton } from '@/modules/sales/ui/components/my-sales-list';
import { SalesStats } from '@/modules/sales/ui/components/sales-stats';
import { ProductFormDialog } from '@/modules/dashboard/ui/components/product-form-dialog';
import { DeleteProductDialog } from '@/modules/dashboard/ui/components/delete-product-dialog';
import { Suspense } from 'react';

type TabType = 'account' | 'purchases' | 'products' | 'sales';

export default function MyStorePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<TabType>('account');

  // Refetch on mount and window focus to catch logouts from other tabs
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always check fresh
  });

  useEffect(() => {
    // Wait until session is fetched before redirecting
    if (!session.isFetched) return;
    
    // Not logged in -> redirect to homepage
    if (!session.data?.user) {
      router.push('/');
      return;
    }
  }, [session.isFetched, session.data, router]);

  // Show loading while session is being fetched
  if (session.isLoading || !session.isFetched) {
    return <LoadingState />;
  }

  // Not authenticated - show loading while redirect happens
  if (!session.data?.user) {
    return <LoadingState />;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Store</h1>
        <p className="text-gray-600">
          Manage your account, purchases, products, and sales
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'account'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">My</span> Account
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'purchases'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">My</span> Purchases
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'products'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">My</span> Products
          <OutOfStockBadge />
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'sales'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Sales
        </button>
      </div>

      {/* Content */}
      {activeTab === 'account' && <AccountSection />}
      {activeTab === 'purchases' && <PurchasesSection />}
      {activeTab === 'products' && <ProductsSection />}
      {activeTab === 'sales' && <SalesSection />}
    </div>
  );
}

// Component to show out-of-stock count badge
function OutOfStockBadge() {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.products.getMyProducts.queryOptions({
      limit: 1000, // Get all products to count out-of-stock
      includeArchived: false,
    }),
    select: (data) => {
      // Count products with quantity 0
      return data.docs.filter((product) => (product.quantity ?? 0) === 0).length;
    },
  });

  if (!data || data === 0) return null;

  return (
    <Badge variant="destructive" className="ml-1 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
      {data}
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  );
}

function AccountSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const { data: statsData, isLoading: statsLoading } = useQuery({
    ...trpc.orders.getDashboardStats.queryOptions(),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    ...trpc.orders.getMyOrders.queryOptions({
      limit: 5,
      page: 1,
    }),
  });

  const confirmReceiptMutation = useMutation(
    trpc.orders.confirmReceipt.mutationOptions({
      onSuccess: () => {
        toast.success('Receipt confirmed! Order marked as completed.');
        queryClient.invalidateQueries(trpc.orders.getMyOrders.queryFilter());
        queryClient.invalidateQueries(trpc.orders.getDashboardStats.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to confirm receipt');
      },
    })
  );

  const handleConfirmReceipt = async (orderId: string) => {
    await confirmReceiptMutation.mutateAsync({ orderId });
  };

  const stats = statsData ?? {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  };

  const recentOrders = ordersData?.orders ?? [];
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
  });

  return (
    <div className="container max-w-7xl mx-auto space-y-8">
      {/* Statistics Cards */}
      <OrderStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Orders</h2>
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
                <User className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>Manage your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.data?.user?.roles?.includes('tenant') || session.data?.user?.roles?.includes('super-admin') ? (
                <div className="space-y-3 p-4 bg-muted rounded-md">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Profile Information</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.data?.user?.email || 'Not available'}
                      </p>
                      {session.data?.user?.username && (
                        <p className="text-xs text-muted-foreground">
                          Username: {session.data.user.username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-muted rounded-md">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Profile Information</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.data?.user?.email || 'Not available'}
                      </p>
                      {session.data?.user?.username && (
                        <p className="text-xs text-muted-foreground">
                          Username: {session.data.user.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your account is set up as a buyer. Contact support to update your profile.
                  </p>
                </div>
              )}
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PurchasesSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    ...trpc.orders.getMyOrders.queryOptions({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 20,
      page: 1,
    }),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const confirmReceiptMutation = useMutation(trpc.orders.confirmReceipt.mutationOptions({
    onSuccess: () => {
      toast.success('Receipt confirmed! Order marked as completed.');
      queryClient.invalidateQueries(trpc.orders.getMyOrders.queryFilter());
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm receipt');
    },
  }));

  const handleConfirmReceipt = async (orderId: string) => {
    await confirmReceiptMutation.mutateAsync({ orderId });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-900 mb-1">
          All Orders ({orders.length})
        </h2>
        <p className="text-sm text-green-700">
          View and manage order fulfillment and delivery status
        </p>
      </div>

      {/* View & Auto-Refresh Toggle */}
      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <Button
          className={`gap-2 px-3 py-1 rounded border ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" /> Grid
        </Button>
        <Button
          className={`gap-2 px-3 py-1 rounded border ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" /> List
        </Button>
        <Button
          className={`gap-2 px-3 py-1 rounded border ${autoRefresh ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
        </Button>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onConfirmReceiptAction={handleConfirmReceipt}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onConfirmReceiptAction={handleConfirmReceipt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductsSection() {
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateProduct = () => {
    setDialogMode("create");
    setSelectedProductId(null);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    setDialogMode("edit");
    setSelectedProductId(productId);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-2 xs:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 flex-col xs:flex-row gap-3 xs:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Products</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage your product listings
              </p>
            </div>
            <Button 
              onClick={handleCreateProduct}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full xs:w-auto text-sm sm:text-base"
              size="sm"
            >
              <PlusIcon className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
              Add Product
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")} className="justify-start">
            <ToggleGroupItem value="grid" aria-label="Grid view" className="text-xs sm:text-sm">
              <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="text-xs sm:text-sm">
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Products Grid */}
        <Suspense fallback={<MyProductsListSkeleton />}>
          <MyProductsList 
            searchQuery={debouncedSearch}
            viewMode={viewMode}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        </Suspense>
      </div>

      {/* Dialogs */}
      <ProductFormDialog
        open={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        productId={selectedProductId}
        mode={dialogMode}
      />
      
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        productId={selectedProductId}
        productName={selectedProductName}
      />
    </div>
  );
}

function SalesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-7xl mx-auto">
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
}
