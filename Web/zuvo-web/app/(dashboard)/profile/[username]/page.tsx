import type { Metadata } from "next";
export const metadata: Metadata = { title: "Profile" };
export default function ProfilePage({ params }: { params: { username: string } }) {
  return (
    <div className="animate-in">
      <h1 className="font-display text-2xl font-bold mb-6">@{params.username}</h1>
      <p className="text-muted text-sm">Implemented in <code className="font-mono text-xs">feature/profile-view</code></p>
    </div>
  );
}
