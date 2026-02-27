import type { Metadata } from "next";
export const metadata: Metadata = { title: "Post" };
export default function PostPage({ params }: { params: { slug: string } }) {
  return (
    <div className="animate-in">
      <h1 className="font-display text-2xl font-bold mb-6">Post: {params.slug}</h1>
      <p className="text-muted text-sm">Implemented in <code className="font-mono text-xs">feature/blog-post-detail</code></p>
    </div>
  );
}
