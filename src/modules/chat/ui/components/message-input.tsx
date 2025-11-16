"use client";

import { useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

interface MessageInputProps {
  conversationId: string;
  receiverId: string;
  currentUserId: string; // Add currentUserId to know who is sending
  onMessageSent?: () => void;
}

export function MessageInput({
  conversationId,
  receiverId,
  currentUserId,
  onMessageSent,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation(
    trpc.chat.sendMessage.mutationOptions({
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: trpc.chat.getMessages.queryKey({ conversationId }),
        });

        // Snapshot previous value
        const previousMessages = queryClient.getQueryData(
          trpc.chat.getMessages.queryKey({ 
            conversationId, 
            limit: 50, 
            page: 1 
          })
        );

        // Optimistically update with new message
        queryClient.setQueryData(
          trpc.chat.getMessages.queryKey({ 
            conversationId, 
            limit: 50, 
            page: 1 
          }),
          (old: any) => {
            if (!old) return old;
            
            const optimisticMessage = {
              id: `temp-${Date.now()}`,
              content: variables.content,
              sender: { id: currentUserId },
              receiver: { id: variables.receiverId },
              conversation: conversationId,
              read: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              attachments: variables.attachments || [],
            };

            return {
              ...old,
              docs: [optimisticMessage, ...old.docs],
            };
          }
        );

        return { previousMessages };
      },
      onError: (err, variables, context) => {
        // Revert on error
        if (context?.previousMessages) {
          queryClient.setQueryData(
            trpc.chat.getMessages.queryKey({ 
              conversationId, 
              limit: 50, 
              page: 1 
            }),
            context.previousMessages
          );
        }
      },
      onSuccess: () => {
        setMessage("");
        setAttachments([]);
        // Refetch to get the real message with ID
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getMessages.queryKey({ conversationId }),
        });
        onMessageSent?.();
      },
    })
  );

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    if (sendMessageMutation.isPending) return; // Prevent double-send

    sendMessageMutation.mutate({
      conversationId,
      receiverId,
      content: message.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {attachments.map((attachmentId, index) => (
            <div
              key={attachmentId}
              className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
            >
              <Paperclip className="h-3 w-3" />
              <span>Attachment {index + 1}</span>
              <button
                onClick={() =>
                  setAttachments(attachments.filter((_, i) => i !== index))
                }
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[200px] resize-none"
          disabled={sendMessageMutation.isPending}
        />

        <Button
          onClick={handleSend}
          disabled={
            (!message.trim() && attachments.length === 0) ||
            sendMessageMutation.isPending
          }
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {sendMessageMutation.isError && (
        <p className="text-sm text-destructive mt-2">
          Failed to send message. Please try again.
        </p>
      )}
    </div>
  );
}
