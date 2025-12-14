import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";

import { PerformanceMonitor } from "@/components/performance-monitor";
import { NavigationProgress } from "@/components/navigation-progress";
import { Navbar } from "@/modules/home/ui/components/navbar";
import { NotificationProvider } from "@/components/notification-provider";
import { ClientNotificationWrapper } from "@/components/client-notification-wrapper";
import { PWAInstallGlobal } from "@/components/pwa-install-global";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ToolBay - Construction Materials Marketplace",
  description: "Rwanda's premier online marketplace for construction materials, tools, and engineering supplies",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body
        className={`${dmSans.className} antialiased`}
      >
        <NuqsAdapter>
          <TRPCReactProvider>
            <NotificationProvider>
              <NavigationProgress />
              <PWAInstallGlobal />
              <ClientNotificationWrapper />
              <Navbar />
              {children}
              <Toaster />
              <PerformanceMonitor />
            </NotificationProvider>
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
