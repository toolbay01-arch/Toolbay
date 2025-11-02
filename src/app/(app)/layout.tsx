import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { NavigationProgress } from "@/components/navigation-progress";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toolboxx - Construction Materials Marketplace",
  description: "Rwanda's premier online marketplace for construction materials, tools, and engineering supplies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.className} antialiased`}
      >
        <NuqsAdapter>
          <TRPCReactProvider>
            <NavigationProgress />
            {children}
            <Toaster />
            <PerformanceMonitor />
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
