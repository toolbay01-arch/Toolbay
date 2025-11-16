"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon, LogOut, ShoppingCart, User, LogIn, MessageCircle } from "lucide-react";
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

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

interface NavbarItemProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
};

const NavbarItem = ({
  href,
  children,
  isActive,
}: NavbarItemProps) => {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "bg-transparent hover:bg-transparent rounded-full hover:border-primary border-transparent px-3.5 text-lg",
        isActive && "bg-black text-white hover:bg-black hover:text-white",
      )}
    >
      <OptimizedLink href={href}>
        {children}
      </OptimizedLink>
    </Button>
  );
};

const publicNavbarItems = [
  { href: "/", children: "Home" },
  { href: "/about", children: "About" },
  { href: "/features", children: "Features" },
  { href: "/pricing", children: "Pricing" },
  { href: "/contact", children: "Contact" },
];

const customerNavbarItems = [
  { href: "/", children: "Home" },
  { href: "/my-account", children: "My Account" },
  { href: "/orders", children: "My Orders" },
  { href: "/users", children: "Find Users" },
  { href: "/about", children: "About" },
  { href: "/contact", children: "Contact" },
  { href: "/cart", children: "My Cart" },
];

const tenantNavbarItems = [
  { href: "/", children: "Home" },
  { href: "/my-products", children: "My Products" },
  { href: "/my-sales", children: "My Sales" },
  { href: "/my-account", children: "My Account" },
  { href: "/orders", children: "My Orders" },
  { href: "/users", children: "Find Users" },
  { href: "/about", children: "About" },
  { href: "/contact", children: "Contact" },
  { href: "/cart", children: "My Cart" },
];

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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry session checks
    refetchOnMount: true, // Always check session on mount
    refetchOnWindowFocus: true, // Check session when window regains focus
  });

  // Get unread message count for logged-in users
  const { data: unreadData } = useQuery({
    ...trpc.chat.getUnreadCount.queryOptions(),
    enabled: !!session.data?.user,
    refetchInterval: 60000, // Increased from 30s to 60s
    staleTime: 30000,
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
    onSuccess: () => {
      toast.success("Logged out successfully");
      
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
    ? session.data.user.roles?.includes('tenant') 
      ? tenantNavbarItems 
      : customerNavbarItems 
    : publicNavbarItems;

  const isLoggedIn = !!session.data?.user;

  return (
    <nav className="h-20 flex border-b justify-between font-medium bg-white">
      {/* Logo - Smaller on mobile, left-aligned */}
      <Link href="/" className="pl-3 lg:pl-6 flex items-center">
        <span className={cn("text-2xl lg:text-5xl font-semibold", poppins.className)}>
          Toolboxx
        </span>
      </Link>

      <NavbarSidebar
        items={navbarItems}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        isLoggingOut={logout.isPending}
      />

      {/* Desktop Navigation - Hidden on mobile */}
      <div className="items-center gap-4 hidden lg:flex">
        {navbarItems.map((item) => (
          <NavbarItem
            key={item.href}
            href={item.href}
            isActive={pathname === item.href}
          >
            {item.children}
          </NavbarItem>
        ))}
      </div>

      {/* Desktop Auth Buttons - Hidden on mobile */}
      {session.data?.user ? (
        <div className="hidden lg:flex items-center">
          {/* Chat Icon with Badge */}
          <OptimizedLink
            href="/chat"
            prefetch={true}
            className={cn(
              "relative border-l border-t-0 border-b-0 border-r-0 px-6 h-full flex items-center justify-center hover:bg-muted transition-colors",
              pathname.startsWith('/chat') && "bg-muted"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            {(unreadData?.totalUnread || 0) > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute top-4 right-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs rounded-full pointer-events-none"
              >
                {(unreadData?.totalUnread || 0) > 99 ? "99+" : unreadData?.totalUnread}
              </Badge>
            )}
          </OptimizedLink>

          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-12 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-lg"
          >
            <Link 
              href={session.data.user.roles?.includes('super-admin') ? "/admin" : session.data.user.roles?.includes('tenant') ? "/dashboard" : "/my-account"}
              prefetch={true}
            >
              {session.data.user.roles?.includes('super-admin') ? "Admin Panel" : session.data.user.roles?.includes('tenant') ? "Dashboard" : "My Account"}
            </Link>
          </Button>
          <Button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="border-l border-t-0 border-b-0 border-r-0 px-12 h-full rounded-none bg-red-600 text-white hover:bg-red-700 transition-colors text-lg flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      ) : (
        <div className="hidden lg:flex">
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-12 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-lg"
          >
            <OptimizedLink prefetch={true} href="/sign-in">
              Log in
            </OptimizedLink>
          </Button>
          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-12 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-lg"
          >
            <OptimizedLink prefetch={true} href="/sign-up">
              Sign Up
            </OptimizedLink>
          </Button>
        </div>
      )}

      {/* Mobile Icons - Right Side */}
      <div className="flex lg:hidden items-center gap-1 pr-2">
        {/* User Icon with Dropdown for logged in users or Login icon */}
        {isLoggedIn ? (
          <>
            {/* Chat Icon with Badge */}
            <Link 
              href="/chat"
              prefetch={true}
              className={cn(
                "relative h-12 w-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors outline-none focus:outline-none active:bg-gray-200",
                pathname.startsWith('/chat') && "bg-gray-200"
              )}
            >
              <MessageCircle className="h-5 w-5" />
              {(unreadData?.totalUnread || 0) > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none"
                >
                  {(unreadData?.totalUnread || 0) > 99 ? "99+" : unreadData?.totalUnread}
                </Badge>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative h-12 w-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors outline-none focus:outline-none active:bg-gray-200"
              >
                <User className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link 
                  href={session.data?.user?.roles?.includes('super-admin') ? "/admin" : session.data?.user?.roles?.includes('tenant') ? "/dashboard" : "/my-account"}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  My Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/orders" className="cursor-pointer">
                  Orders
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logout.isPending}
                className="cursor-pointer text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {logout.isPending ? "Logging out..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        ) : (
          <Link 
            href="/sign-in"
            className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors outline-none focus:outline-none active:bg-gray-200"
          >
            <LogIn className="h-5 w-5" />
          </Link>
        )}

        {/* Cart Icon with Badge - Always visible */}
        <Link 
          href="/cart" 
          className="relative h-12 w-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors outline-none focus:outline-none active:bg-gray-200"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full pointer-events-none"
            >
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </Badge>
          )}
        </Link>

        {/* Menu Icon */}
        <button
          type="button"
          className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors outline-none focus:outline-none active:bg-gray-200"
          onClick={() => setIsSidebarOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
};
