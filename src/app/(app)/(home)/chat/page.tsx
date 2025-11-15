import { redirect } from "next/navigation";

import { caller } from "@/trpc/server";
import { ChatList } from "@/modules/chat/ui/components/chat-list";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await caller.auth.session();

  if (!session.user) {
    redirect("/sign-in");
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="border rounded-lg h-full flex flex-col md:flex-row overflow-hidden">
        {/* Conversation List */}
        <div className="w-full md:w-80 border-r">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <ChatList currentUserId={session.user.id} />
        </div>

        {/* Empty state */}
        <div className="flex-1 hidden md:flex items-center justify-center bg-muted/10">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Select a conversation</h2>
            <p className="text-muted-foreground">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
