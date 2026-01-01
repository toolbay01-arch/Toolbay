"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, Filter } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import type { Notification } from "@/payload-types";

export default function NotificationsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Get notifications
  const { data, isLoading } = useQuery({
    ...trpc.notifications.getNotifications.queryOptions({
      limit: 50,
      page: 1,
      ...(typeFilter !== "all" && { type: typeFilter as any }),
      ...(filter === "unread" && { unreadOnly: true }),
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get unseen count
  const { data: unseenCount } = useQuery({
    ...trpc.notifications.getUnseenCount.queryOptions(),
    refetchInterval: 30000,
  });

  // Mark as seen mutation
  const markAsSeen = useMutation(
    trpc.notifications.markAsSeen.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notifications.getUnseenCount.queryFilter());
        queryClient.invalidateQueries(trpc.notifications.getNotifications.queryFilter());
      },
    })
  );

  // Mark as read mutation
  const markAsRead = useMutation(
    trpc.notifications.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notifications.getUnreadCount.queryFilter());
        queryClient.invalidateQueries(trpc.notifications.getNotifications.queryFilter());
      },
    })
  );

  // Mark all as seen mutation
  const markAllAsSeen = useMutation(
    trpc.notifications.markAllAsSeen.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notifications.getUnseenCount.queryFilter());
        queryClient.invalidateQueries(trpc.notifications.getNotifications.queryFilter());
      },
    })
  );

  // Delete notification mutation
  const deleteNotification = useMutation(
    trpc.notifications.deleteNotification.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notifications.getNotifications.queryFilter());
        queryClient.invalidateQueries(trpc.notifications.getUnseenCount.queryFilter());
      },
    })
  );

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead.mutateAsync({ notificationId: notification.id });
    }

    // Navigate to URL if present
    if (notification.url) {
      router.push(notification.url);
    }
  };

  // Mark all unseen as seen when page loads
  useEffect(() => {
    if (unseenCount && unseenCount.count > 0 && data?.docs) {
      const unseenIds = data.docs
        .filter((n) => !n.seen)
        .map((n) => n.id);
      if (unseenIds.length > 0) {
        markAsSeen.mutate({ notificationIds: unseenIds });
      }
    }
  }, [unseenCount, data, markAsSeen]);

  const notifications = data?.docs || [];

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      payment: "bg-green-100 text-green-800 border-green-300",
      order: "bg-blue-100 text-blue-800 border-blue-300",
      message: "bg-purple-100 text-purple-800 border-purple-300",
      product: "bg-orange-100 text-orange-800 border-orange-300",
      transaction: "bg-yellow-100 text-yellow-800 border-yellow-300",
      system: "bg-gray-100 text-gray-800 border-gray-300",
      engagement: "bg-pink-100 text-pink-800 border-pink-300",
      promotion: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[type] || colors.system;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your activity
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsSeen.mutate()}
            disabled={markAllAsSeen.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as seen
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
            <SelectItem value="product">Products</SelectItem>
            <SelectItem value="transaction">Transactions</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="promotion">Promotions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              You're all caught up! Check back later for updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md cursor-pointer ${
                !notification.read ? "border-l-4 border-l-blue-500" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notification.icon && (
                        <span className="text-lg">{notification.icon}</span>
                      )}
                      <h3 className="font-semibold text-base truncate">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getTypeBadgeColor(
                          notification.type
                        )}`}
                      >
                        {notification.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead.mutate({
                            notificationId: notification.id,
                          });
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate({
                          notificationId: notification.id,
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {data && data.hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline">Load More</Button>
        </div>
      )}
    </div>
  );
}
