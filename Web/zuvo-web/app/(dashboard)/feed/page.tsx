import type { Metadata } from "next";
export const metadata: Metadata = { title: "Feed" };
export default function FeedPage() {
  return (
    <div className="animate-in">
      <h1 className="font-display text-2xl font-bold mb-6">Your Feed</h1>
      <p className="text-muted text-sm">Implemented in <code className="font-mono text-xs">feature/blog-feed</code></p>
    </div>
  );
}
