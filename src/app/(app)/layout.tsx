import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app"
import dynamic from "next/dynamic";

import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";

import { NavigationProgress } from "@/components/navigation-progress";
import { Navbar } from "@/modules/home/ui/components/navbar";
import { NotificationProvider } from "@/components/notification-provider";

// Lazy load non-critical components to improve initial load performance
// Note: These components are already client components, so they're safe to lazy load
const PerformanceMonitor = dynamic(() => import("@/components/performance-monitor").then(mod => ({ default: mod.PerformanceMonitor })));
const ClientNotificationWrapper = dynamic(() => import("@/components/client-notification-wrapper").then(mod => ({ default: mod.ClientNotificationWrapper })));
const PWAInstallGlobal = dynamic(() => import("@/components/pwa-install-global").then(mod => ({ default: mod.PWAInstallGlobal })));
const WebPushInitializer = dynamic(() => import("@/components/web-push-initializer").then(mod => ({ default: mod.WebPushInitializer })));
const ClientSubscriptionRefresh = dynamic(() => import("@/components/client-subscription-refresh").then(mod => ({ default: mod.ClientSubscriptionRefresh })));
const CartMigration = dynamic(() => import("@/components/cart-migration").then(mod => ({ default: mod.CartMigration })));

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap", // Use font-display: swap for better performance
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "ToolBay - Materials Marketplace",
  description: "The Premier online marketplace for materials, tools, and engineering supplies",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${dmSans.className} antialiased`}
      >
        <NuqsAdapter>
          <TRPCReactProvider>
            <NotificationProvider>
              <CartMigration />
              <WebPushInitializer />
              <ClientSubscriptionRefresh />
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
