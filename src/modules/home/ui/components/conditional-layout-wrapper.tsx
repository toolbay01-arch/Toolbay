"use client";

import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export const ConditionalLayoutWrapper = ({ children }: Props) => {
  const pathname = usePathname();
  
  // Use fixed height for chat pages to prevent scrolling
  const isChatPage = pathname?.startsWith("/chat");
  
  if (isChatPage) {
    return (
      <div className="h-screen flex flex-col lg:pt-16 overflow-hidden">
        {children}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen lg:pt-16">
      {children}
    </div>
  );
};
