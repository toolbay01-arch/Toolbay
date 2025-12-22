"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, User, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserSearchView() {
  const trpc = useTRPC();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [userType, setUserType] = useState<"all" | "tenants" | "clients">("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: session } = useQuery(trpc.auth.session.queryOptions());

  const { data: users, isLoading } = useQuery({
    ...trpc.users.search.queryOptions({ 
      query: debouncedQuery,
      userType,
    }),
    enabled: debouncedQuery.length >= 2,
  });

  const startConversation = useMutation(trpc.chat.startConversation.mutationOptions({
    onSuccess: (conversation) => {
      router.push(`/chat/${conversation.id}`);
      toast.success("Chat started successfully");
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        // Redirect to login page with return URL immediately (no toast to avoid flash)
        const loginUrl = `/sign-in?redirect=${encodeURIComponent(pathname)}`;
        router.prefetch(loginUrl);
        router.push(loginUrl);
      } else {
        toast.error(error.message || "Failed to start chat");
      }
    },
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      setDebouncedQuery(searchQuery);
    } else {
      toast.error("Please enter at least 2 characters");
    }
  };

  const handleMessageUser = (userId: string, username: string) => {
    if (!session?.user) {
      // Redirect to login with current page as return URL
      const loginUrl = `/sign-in?redirect=${encodeURIComponent(pathname)}`;
      router.prefetch(loginUrl);
      router.push(loginUrl);
      return;
    }

    if (userId === session.user.id) {
      toast.error("You cannot message yourself");
      return;
    }

    startConversation.mutate({
      participantId: userId,
      initialMessage: `Hi @${username}`,
    });
  };

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Users</h1>
        <p className="text-muted-foreground">
          Search for sellers or buyers and start a conversation
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="tenants">Sellers Only</SelectItem>
              <SelectItem value="clients">Buyers Only</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {debouncedQuery.length < 2 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Enter at least 2 characters to search for users</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </div>
                  <div className="h-10 w-32 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No users found matching &quot;{debouncedQuery}&quot;</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const isSeller = user.roles?.includes("tenant") || false;
            const isBuyer = user.roles?.includes("client") || false;
            const tenantInfo = user.tenants?.[0];

            return (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {isSeller ? (
                          <Store className="h-5 w-5 text-blue-600" />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                        <h3 className="font-semibold text-lg">@{user.username}</h3>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      
                      <div className="flex gap-2">
                        {isSeller && <Badge variant="default">Seller</Badge>}
                        {isBuyer && <Badge variant="secondary">Buyer</Badge>}
                        {user.roles?.includes("super-admin") && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                      </div>

                      {tenantInfo?.tenantName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {tenantInfo.tenantName}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleMessageUser(user.id, user.username)}
                      disabled={startConversation.isPending || user.id === session?.user?.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {startConversation.isPending ? "Starting..." : "Send Message"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
