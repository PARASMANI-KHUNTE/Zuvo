import type { Metadata } from "next";
export const metadata: Metadata = { title: "Search" };
export default function SearchPage() {
  return (
    <div className="animate-in">
      <h1 className="font-display text-2xl font-bold mb-6">Search</h1>
      <p className="text-muted text-sm">Implemented in <code className="font-mono text-xs">feature/search-page</code></p>
    </div>
  );
}
