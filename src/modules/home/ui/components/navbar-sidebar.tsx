"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, ChevronDown, ChevronRight, Store, BookmarkCheck, Bell } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { OptimizedLink } from "@/components/optimized-link";
import { cn } from "@/lib/utils";
import { useWebPush } from "@/hooks/use-web-push";

import type { NavbarItem } from "./navbar";

interface Props {
  items: NavbarItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
  userId?: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const NavbarSidebar = ({
  items,
  open,
  onOpenChange,
  isLoggedIn,
  userId,
  onLogout,
  isLoggingOut,
}: Props) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading } = useWebPush({ userId });

  const handleLogout = () => {
    onLogout();
    onOpenChange(false);
  };

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset expanded items when closing
    setExpandedItems(new Set());
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="left"
        className="p-0 transition-none"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle>
            Menu
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex flex-col overflow-y-auto h-full pb-2">
          {items.map((item) => (
            item.subItems ? (
              // Expandable item with sub-items
              <div key={item.href}>
                <button
                  onClick={() => toggleExpand(item.href)}
                  className="w-full text-left p-4 active:bg-black active:text-white flex items-center justify-between text-base font-medium touch-manipulation"
                >
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {item.children}
                  </span>
                  {expandedItems.has(item.href) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {/* Sub-items */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-200 bg-gray-50",
                    expandedItems.has(item.href) ? "max-h-96" : "max-h-0"
                  )}
                >
                  {item.subItems.map((subItem) => (
                    <OptimizedLink
                      key={subItem.href}
                      href={subItem.href}
                      className="w-full text-left py-3 px-8 active:bg-black active:text-white flex items-center text-sm font-medium border-l-2 border-gray-200 touch-manipulation"
                      onClick={handleClose}
                    >
                      {subItem.children}
                    </OptimizedLink>
                  ))}
                </div>
              </div>
            ) : (
              // Regular item
            <OptimizedLink
              key={item.href}
              href={item.href}
              className="w-full text-left p-4 active:bg-black active:text-white flex items-center gap-2 text-base font-medium touch-manipulation"
                onClick={handleClose}
            >
              {item.children}
            </OptimizedLink>
            )
          ))}
          <div className="border-t">
            {/* Notification Toggle Button - Show for logged in users */}
            {isLoggedIn && userId && isSupported && !isLoading && (
              <>
                {!isSubscribed ? (
                  <Button
                    onClick={async () => {
                      console.log('[Sidebar] Enable notifications clicked');
                      await subscribe();
                    }}
                    disabled={isLoading}
                    className="w-full text-left p-4 active:bg-blue-600 bg-transparent active:text-white flex items-center text-base font-medium gap-2 rounded-none justify-start text-blue-600 touch-manipulation"
                    variant="ghost"
                  >
                    <Bell className="h-4 w-4" />
                    Enable Notifications
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      console.log('[Sidebar] Disable notifications clicked');
                      await unsubscribe();
                    }}
                    disabled={isLoading}
                    className="w-full text-left p-4 active:bg-gray-600 bg-transparent active:text-white flex items-center text-base font-medium gap-2 rounded-none justify-start text-gray-600 touch-manipulation"
                    variant="ghost"
                  >
                    <Bell className="h-4 w-4 fill-current" />
                    Disable Notifications
                  </Button>
                )}
              </>
            )}
            
            {isLoggedIn ? (
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left p-4 active:bg-red-600 bg-transparent active:text-white flex items-center text-base font-medium gap-2 rounded-none justify-start text-red-600 touch-manipulation"
                variant="ghost"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            ) : (
              <>
                <OptimizedLink 
                  onClick={handleClose} 
                  href="/sign-in" 
                  className="w-full text-left p-4 active:bg-black active:text-white flex items-center text-base font-medium touch-manipulation"
                >
                  Log in
                </OptimizedLink>
                <OptimizedLink 
                  onClick={handleClose} 
                  href="/sign-up" 
                  className="w-full text-left p-4 active:bg-black active:text-white flex items-center text-base font-medium touch-manipulation"
                >
                  Sign Up
                </OptimizedLink>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
