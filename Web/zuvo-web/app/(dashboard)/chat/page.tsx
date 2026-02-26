import type { Metadata } from "next";
export const metadata: Metadata = { title: "Chat" };
export default function ChatPage() {
  return (
    <div className="animate-in">
      <h1 className="font-display text-2xl font-bold mb-6">Messages</h1>
      <p className="text-muted text-sm">Implemented in <code className="font-mono text-xs">feature/realtime-chat-ui</code></p>
    </div>
  );
}
