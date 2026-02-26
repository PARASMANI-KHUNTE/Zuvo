"use client";
import { ArrowRight, Zap, Shield, Globe, Loader2 } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import PostCard from "./components/PostCard";

export default function Home() {
  const { posts, loading, error } = usePosts();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Hero Section */}
      <div className="max-w-4xl w-full space-y-8 mt-12">
        <div className="inline-block p-1 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/10 backdrop-blur-xl mb-4">
          <span className="px-4 py-1 text-xs font-medium text-primary uppercase tracking-widest">
            Welcome to the Future
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
          Experience <br />
          <span className="text-neon">Social Purity.</span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Zuvo is a high-performance, decentralized social platform designed for those who demand more from their digital world.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <button className="btn-primary flex items-center gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
          <button className="px-6 py-3 rounded-full border border-white/10 glass-panel hover:bg-white/10 transition-all font-semibold">
            Learn More
          </button>
        </div>
      </div>

      {/* Feed Section */}
      <div className="max-w-4xl w-full mt-32 space-y-12">
        <div className="text-left border-l-4 border-primary pl-6">
          <h2 className="text-4xl font-bold">Trending Now</h2>
          <p className="text-slate-400 mt-2">Discover what's happening across the decentralized web.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-slate-500 font-medium">Curating your experience...</p>
          </div>
        ) : error ? (
          <div className="glass-panel p-12 text-center space-y-4">
            <p className="text-red-400 font-medium">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary py-2 px-6">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  author={post.author.username || "Anonymous"}
                  avatar={post.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author._id}`}
                  content={post.content}
                  image={post.image !== "no-photo.jpg" ? post.image : undefined}
                  timestamp={new Date(post.createdAt).toLocaleDateString()}
                  likes={post.likesCount}
                  comments={post.commentsCount}
                />
              ))
            ) : (
              <div className="glass-panel p-16 text-center">
                <p className="text-slate-500 text-lg">No posts yet. Be the first to share something!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full">
        <FeatureCard
          icon={<Zap className="text-primary" />}
          title="Ultra Fast"
          desc="Optimized for millisecond response times and real-time interactions."
        />
        <FeatureCard
          icon={<Shield className="text-secondary" />}
          title="Secure"
          desc="End-to-end encryption and decentralized ownership of your data."
        />
        <FeatureCard
          icon={<Globe className="text-accent" />}
          title="Global"
          desc="Connect with creators and visionaries from around the globe."
        />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-panel p-8 text-left space-y-4 hover:border-white/20 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
