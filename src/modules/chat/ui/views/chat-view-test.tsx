"use client";

import { useEffect } from "react";

export function ChatViewTest({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    console.log("✅ TEST COMPONENT MOUNTED!", conversationId);
    alert("Test component loaded for: " + conversationId);
  }, [conversationId]);

  console.log("✅ TEST COMPONENT RENDERING", conversationId);

  return (
    <div className="p-8 bg-green-100">
      <h1 className="text-2xl font-bold">TEST COMPONENT</h1>
      <p>Conversation ID: {conversationId}</p>
      <p>If you see this, client components work!</p>
    </div>
  );
}
