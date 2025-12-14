"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

export const ConditionalFooter = () => {
  const pathname = usePathname();
  
  // Hide footer on chat pages
  const shouldHideFooter = pathname?.startsWith("/chat");
  
  if (shouldHideFooter) {
    return null;
  }
  
  return <Footer />;
};
