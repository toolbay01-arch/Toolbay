import Link from "next/link";
import { LogOut } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { OptimizedLink } from "@/components/optimized-link";

interface NavbarItem {
  href: string;
  children: React.ReactNode;
}

interface Props {
  items: NavbarItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const NavbarSidebar = ({
  items,
  open,
  onOpenChange,
  isLoggedIn,
  onLogout,
  isLoggingOut,
}: Props) => {
  const handleLogout = () => {
    onLogout();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            <OptimizedLink
              key={item.href}
              href={item.href}
              className="w-full text-left p-4 hover:bg-black hover:text-white flex items-center text-base font-medium"
              onClick={() => onOpenChange(false)}
            >
              {item.children}
            </OptimizedLink>
          ))}
          <div className="border-t">
            {isLoggedIn ? (
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left p-4 hover:bg-red-600 bg-transparent hover:text-white flex items-center text-base font-medium gap-2 rounded-none justify-start text-red-600"
                variant="ghost"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            ) : (
              <>
                <OptimizedLink 
                  onClick={() => onOpenChange(false)} 
                  href="/sign-in" 
                  className="w-full text-left p-4 hover:bg-black hover:text-white flex items-center text-base font-medium"
                >
                  Log in
                </OptimizedLink>
                <OptimizedLink 
                  onClick={() => onOpenChange(false)} 
                  href="/sign-up" 
                  className="w-full text-left p-4 hover:bg-black hover:text-white flex items-center text-base font-medium"
                >
                  Start Supplying
                </OptimizedLink>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
