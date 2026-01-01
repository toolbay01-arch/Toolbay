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
import { WebPushInitializer } from "@/components/web-push-initializer";
import { ClientSubscriptionRefresh } from "@/components/client-subscription-refresh";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ToolBay - Construction Materials Marketplace",
  description: "Rwanda's premier online marketplace for construction materials, tools, and engineering supplies",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
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
