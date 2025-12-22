"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon, LogOut, ShoppingCart, LogIn, Store, ChevronDown, Wallet, MessageCircle, BookmarkCheck, Eye } from "lucide-react";
import { Poppins } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OptimizedLink } from "@/components/optimized-link";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { NavbarSidebar } from "./navbar-sidebar";
import { useCartStore } from "@/modules/checkout/store/use-cart-store";
import { NotificationIndicator } from "@/components/notification-indicator";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

export interface NavbarItem {
  href: string;
  children: React.ReactNode;
  subItems?: NavbarItem[];
};

interface NavbarItemProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  badgeCount?: number;
};

const NavbarItemButton = ({
  href,
  children,
  isActive,
  badgeCount,
}: NavbarItemProps) => {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "bg-transparent hover:bg-transparent rounded-full hover:border-primary border-transparent px-2.5 text-sm whitespace-nowrap flex items-center gap-1.5 relative",
        isActive && "bg-black text-white hover:bg-black hover:text-white",
      )}
    >
      <OptimizedLink href={href}>
        {children}
        {badgeCount !== undefined && badgeCount !== null && badgeCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </Badge>
        )}
      </OptimizedLink>
    </Button>
  );
};

const publicNavbarItems: NavbarItem[] = [
  { href: "/", children: "Home" },
  { href: "/about", children: "About" },
  { href: "/features", children: "Features" },
  { href: "/pricing", children: "Pricing" },
  { href: "/contact", children: "Contact" },
];

const customerNavbarItems: NavbarItem[] = [
  { href: "/", children: "Home" },
  { href: "/orders", children: "My Purchases" },
  { href: "/library", children: (
    <>
      <BookmarkCheck className="h-4 w-4" />
      <span>Library</span>
    </>
  ) },
  { href: "/cart", children: "My Cart" },
];

const myStoreBaseItems: NavbarItem[] = [
  { href: "/my-account", children: "My Account" },
  { href: "/orders", children: "My Purchases" },
  { href: "/my-products", children: "My Products" },
  { href: "/my-sales", children: "Sales" },
];

const tenantNavbarItems: NavbarItem[] = [
  { href: "/", children: "Home" },
  { href: "/verify-payments", children: "Transactions" },
  { href: "/my-store", children: (
    <>
      <Store className="h-4 w-4" />
      <span>My Store</span>
    </>
  ) },
  { href: "/orders", children: "My Purchases" },
  { href: "/library", children: (
    <>
      <BookmarkCheck className="h-4 w-4" />
      <span>Library</span>
    </>
  ) },
  // { 
  //   href: "#", 
  //   children: "Store Menu",
  //   subItems: myStoreBaseItems,
  // },
  { href: "/cart", children: "My Cart" },
];

// Desktop dropdown for items with subItems
const NavbarDropdownItem = ({ 
  item, 
  pathname,
  accountHref,
}: { 
  item: NavbarItem; 
  pathname: string;
  accountHref: string;
}) => {
  const subItems = item.subItems?.map((subItem) => ({
    ...subItem,
    href: subItem.children === "My Account" ? accountHref : subItem.href,
  }));
  const isAnySubItemActive = subItems?.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'));
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "bg-transparent hover:bg-transparent rounded-full hover:border-primary border-transparent px-2.5 text-sm whitespace-nowrap gap-1",
            isAnySubItemActive && "bg-black text-white hover:bg-black hover:text-white",
          )}
        >
          <Store className="h-4 w-4" />
          {item.children}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {subItems?.map((subItem) => (
          <DropdownMenuItem key={subItem.href} asChild>
            <Link 
              href={subItem.href}
              className={cn(
                "cursor-pointer",
                pathname === subItem.href && "bg-accent"
              )}
            >
              {subItem.children}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  // Get total cart items across all tenants - handle undefined tenantCarts during hydration
  const tenantCarts = useCartStore((state) => state.tenantCarts);
  const cartItemCount = tenantCarts 
    ? Object.values(tenantCarts).reduce((total, cart) => {
        return total + (cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0);
      }, 0)
    : 0;
  
  // Configure session query for immediate UI updates
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    staleTime: 0, // Always refetch to catch logouts from other tabs
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry session checks
    refetchOnMount: 'always', // Always check session on mount
    refetchOnWindowFocus: 'always', // Always check session when window regains focus
  });

  const isLoggedIn = !!session.data?.user;

  // Get unread message count for logged-in users
  const { data: unreadData } = useQuery({
    ...trpc.chat.getUnreadCount.queryOptions(),
    enabled: !!session.data?.user,
    refetchInterval: 60000, // Increased from 30s to 60s
    staleTime: 30000,
  });

  // Get unviewed transaction count for tenants
  const isTenant = session.data?.user?.roles?.includes('tenant');
  const { data: transactionNotifications } = useQuery({
    ...trpc.transactions.getNotificationCount.queryOptions(),
    enabled: !!isTenant,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  // Get product notification count for tenants
  const { data: productNotifications } = useQuery({
    ...trpc.products.getProductNotificationCount.queryOptions(),
    enabled: !!isTenant,
    refetchInterval: 60000, // Check every 60 seconds
    staleTime: 30000,
  });

  // Get total views count for tenants
  const { data: totalViewsData } = useQuery({
    ...trpc.products.getTotalViewsCount.queryOptions(),
    enabled: !!isTenant,
    refetchInterval: 60000, // Check every 60 seconds
    staleTime: 30000,
  });

  // Get order notification count for buyers (customers)
  const isCustomer = session.data?.user?.roles?.includes('client');
  const { data: orderNotifications } = useQuery({
    ...trpc.orders.getOrderNotificationCount.queryOptions(),
    enabled: !!isCustomer,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });
  
  const logout = useMutation(trpc.auth.logout.mutationOptions({
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries(trpc.auth.session.queryFilter());
      
      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(trpc.auth.session.queryKey());
      
      // Optimistically update to logged-out state immediately
      queryClient.setQueryData(
        trpc.auth.session.queryKey(),
        { user: null, permissions: {} }
      );
      
      return { previousSession };
    },
    onSuccess: async () => {
      toast.success("Logged out successfully");
      
      // Invalidate all session-related queries to ensure clean state
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      
      // Clear session cache completely
      queryClient.setQueryData(
        trpc.auth.session.queryKey(),
        { user: null, permissions: {} }
      );
      
      // Remove query from cache to force fresh fetch on next login
      queryClient.removeQueries(trpc.auth.session.queryFilter());
      
      // Navigate to home and refresh any server-side data
      router.push("/");
      router.refresh();
    },
    onError: (error, variables, context) => {
      // Revert to previous state on error
      if (context?.previousSession) {
        queryClient.setQueryData(
          trpc.auth.session.queryKey(),
          context.previousSession
        );
      }
      toast.error(error.message || "Failed to logout");
    },
  }));

  const handleLogout = () => {
    logout.mutate();
  };
  
  // Show tenant items if user is a tenant, customer items if logged in, otherwise show public items
  // While loading, use the cached data to prevent flash
  const navbarItems = session.data?.user
    ? isTenant
      ? tenantNavbarItems
      : customerNavbarItems
    : publicNavbarItems;
  const accountHref = isTenant ? "/dashboard" : "/my-account";
  const mobileStoreItems = myStoreBaseItems.map((item) => ({
    ...item,
    href: item.children === "My Account" ? accountHref : item.href,
  }));
  const sidebarItems = isLoggedIn ? navbarItems : publicNavbarItems;

  if (!isLoggedIn) {
    return (
      <nav className="h-16 flex border-b justify-between font-medium bg-white w-full overflow-x-auto overflow-y-visible sticky top-0 z-50 lg:fixed">
        <Link href="/" className="pl-3 lg:pl-4 flex items-center flex-shrink-0">
          <span className={cn("text-2xl lg:text-3xl font-semibold", poppins.className)}>
            Toolbay
          </span>
        </Link>
        <NavbarSidebar
          items={sidebarItems}
          open={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
          isLoggedIn={isLoggedIn}
          userId={session.data?.user?.id}
          onLogout={handleLogout}
          isLoggingOut={logout.isPending}
        />
        {/* Desktop Navigation for public */}
        <div className="items-center gap-2 hidden lg:flex flex-1 justify-center overflow-x-auto px-2">
          {publicNavbarItems.map((item) => (
            <NavbarItemButton
              key={item.href}
              href={item.href}
              isActive={pathname === item.href}
            >
              {item.children}
            </NavbarItemButton>
          ))}
        </div>
        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex flex-shrink-0">
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-sm"
          >
            <Link href="/sign-in" prefetch={true}>
              Log in
            </Link>
          </Button>
          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-sm"
          >
            <Link href="/sign-up" prefetch={true}>
              Sign Up
            </Link>
          </Button>
        </div>
        {/* Mobile Icons - Right Side: Sign In, Cart, Menu */}
        <div className="flex lg:hidden items-center gap-1 pr-2 flex-shrink-0">
          <Link
            href="/sign-in"
            prefetch={true}
            className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 touch-manipulation outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <LogIn className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            prefetch={true}
            className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 touch-manipulation outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
              >
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </Badge>
            )}
          </Link>
          <button
            type="button"
            className="h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 touch-manipulation outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSidebarOpen(true);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            aria-label="Open menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="h-16 flex border-b justify-between font-medium bg-white w-full overflow-x-auto overflow-y-visible sticky top-0 z-50 lg:fixed">
      {/* Logo - Smaller, more compact */}
      <Link href="/" className="pl-3 lg:pl-4 flex items-center flex-shrink-0 gap-3">
        <div className="flex flex-col min-w-0">
          <span className={cn("text-2xl lg:text-3xl font-semibold", poppins.className)}>
            Toolbay
          </span>
          {/* Mobile: Username/Company below Toolbay */}
          {session.data?.user && (() => {
            const displayName = (session.data.user.username || 
               (session.data.user.tenants?.[0] && 
                typeof session.data.user.tenants[0].tenant === 'object' 
                  ? (session.data.user.tenants[0].tenant as any).name 
                  : null) || 
               'User').trim();
            
            // Debug: Log the actual value
            console.log('Mobile Display Name:', displayName, 'Length:', displayName.length);
            
            return (
              <div className="flex items-center gap-2 lg:hidden -mt-1">
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {displayName}
                </span>
                {/* Show total views for tenants only */}
                {isTenant && totalViewsData && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded-full">
                    <Eye className="h-3 w-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">
                      {totalViewsData.totalViews.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        {/* Desktop: Username/Company next to Toolbay */}
        {session.data?.user && (() => {
          const displayName = (session.data.user.username || 
             (session.data.user.tenants?.[0] && 
              typeof session.data.user.tenants[0].tenant === 'object' 
                ? (session.data.user.tenants[0].tenant as any).name 
                : null) || 
             'User').trim();
          
          return (
            <div className="hidden lg:flex items-center gap-3 border-l pl-3">
              <span className="text-base text-gray-600 whitespace-nowrap">
                {displayName}
              </span>
              {/* Show total views for tenants only */}
              {isTenant && totalViewsData && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                  <Eye className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {totalViewsData.totalViews.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </Link>

      <NavbarSidebar
        items={navbarItems}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        isLoggedIn={isLoggedIn}
        userId={session.data?.user?.id}
        onLogout={handleLogout}
        isLoggingOut={logout.isPending}
      />

      {/* Desktop Navigation - Hidden on mobile */}
      <div className="items-center gap-2 hidden lg:flex flex-1 justify-center overflow-x-auto px-2">
        {navbarItems.map((item) => {
          // Determine badge count for specific items (only pass if > 0)
          let badgeCount: number | undefined;
          if (item.href === "/verify-payments" && transactionNotifications?.count !== undefined && transactionNotifications.count > 0) {
            badgeCount = transactionNotifications.count;
          } else if (item.href === "/my-store" && productNotifications?.count !== undefined && productNotifications.count > 0) {
            badgeCount = productNotifications.count;
          } else if (item.href === "/orders" && orderNotifications?.count !== undefined && orderNotifications.count > 0) {
            badgeCount = orderNotifications.count;
          }

          return item.subItems ? (
            <NavbarDropdownItem key={item.href} item={item} pathname={pathname} accountHref={accountHref} />
          ) : (
            <NavbarItemButton
              key={item.href}
              href={item.href}
              isActive={pathname === item.href}
              badgeCount={badgeCount}
            >
              {item.children}
            </NavbarItemButton>
          );
        })}
      </div>

      {/* Desktop Auth Buttons - Hidden on mobile */}
      {session.data?.user ? (
        <div className="hidden lg:flex items-center flex-shrink-0">
          {/* Notification Indicator */}
          <div className="border-l border-t-0 border-b-0 border-r-0 h-full flex items-center justify-center px-2">
            <NotificationIndicator userId={session.data.user.id} />
          </div>
          
          {/* Chat Icon with Badge */}
          <OptimizedLink
            href="/chat"
            prefetch={true}
            className={cn(
              "relative border-l border-t-0 border-b-0 border-r-0 px-4 h-full flex items-center justify-center hover:bg-muted transition-colors",
              pathname.startsWith('/chat') && "bg-muted"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            {(unreadData?.totalUnread || 0) > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute top-4 right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs rounded-full pointer-events-none"
              >
                {(unreadData?.totalUnread || 0) > 99 ? "99+" : unreadData?.totalUnread}
              </Badge>
            )}
          </OptimizedLink>

          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-6 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-sm whitespace-nowrap"
          >
            <Link 
              href={session.data.user.roles?.includes('super-admin') ? "/admin" : session.data.user.roles?.includes('tenant') ? "/dashboard" : "/my-account"}
              prefetch={true}
            >
              {session.data.user.roles?.includes('super-admin') ? "Admin" : session.data.user.roles?.includes('tenant') ? "Dashboard" : "Account"}
            </Link>
          </Button>
          <Button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="border-l border-t-0 border-b-0 border-r-0 px-6 h-full rounded-none bg-red-600 text-white hover:bg-red-700 transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      ) : (
        <div className="hidden lg:flex flex-shrink-0">
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-sm"
          >
            <Link href="/sign-in" prefetch={true}>
              Log in
            </Link>
          </Button>
          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-sm"
          >
            <Link href="/sign-up" prefetch={true}>
              Sign Up
            </Link>
          </Button>
        </div>
      )}

      {/* Mobile Icons - Right Side */}
        <div className="flex lg:hidden items-center gap-1 pr-2 flex-shrink-0">
        {isTenant && (
          <Link
            href="/my-store"
            prefetch={true}
            className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <Store className="h-5 w-5" />
            {productNotifications?.count !== undefined && productNotifications.count > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
              >
                {productNotifications.count > 99 ? "99+" : productNotifications.count}
              </Badge>
            )}
          </Link>
        )}
        <Link
          href={isTenant ? "/verify-payments" : "/orders"}
          prefetch={true}
          className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation transition-colors"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
          <Wallet className="h-5 w-5" />
          {isTenant && transactionNotifications?.count !== undefined && transactionNotifications.count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
            >
              {transactionNotifications.count > 99 ? "99+" : transactionNotifications.count}
            </Badge>
          )}
          {!isTenant && orderNotifications?.count !== undefined && orderNotifications.count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
            >
              {orderNotifications.count > 99 ? "99+" : orderNotifications.count}
            </Badge>
          )}
        </Link>
        <Link
          href="/chat"
          prefetch={true}
          className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation transition-colors"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <MessageCircle className="h-5 w-5" />
          {(unreadData?.totalUnread || 0) > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
            >
              {(unreadData?.totalUnread || 0) > 99 ? "99+" : unreadData?.totalUnread}
            </Badge>
          )}
        </Link>
        <Link
          href="/cart"
          prefetch={true}
          className="relative h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation transition-colors"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none z-10"
            >
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </Badge>
          )}
        </Link>
        <button
          type="button"
          className="h-12 w-12 min-w-[48px] flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsSidebarOpen(true);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
};
