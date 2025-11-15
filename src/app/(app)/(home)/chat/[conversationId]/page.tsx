import { redirect } from "next/navigation";

import { caller } from "@/trpc/server";
import { ChatView } from "@/modules/chat/ui/views/chat-view";
import { ChatList } from "@/modules/chat/ui/components/chat-list";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await caller.auth.session();

  if (!session.user) {
    redirect("/sign-in");
  }

  const { conversationId } = await params;

  return (
    <div className="container max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="border rounded-lg h-full flex overflow-hidden">
        {/* Conversation List - Hidden on mobile */}
        <div className="hidden md:block w-80 border-r">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <ChatList
            currentUserId={session.user.id}
            selectedConversationId={conversationId}
          />
        </div>

        {/* Chat View */}
        <div className="flex-1">
          <ChatView
            conversationId={conversationId}
            currentUserId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
}
