"use client";
import React from "react";
import { ArrowRight, Zap, Shield, Globe, Loader2 } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import PostCard from "./components/PostCard";
import CreatePost from "./components/CreatePost";
import TrendingSidebar from "./components/TrendingSidebar";
import SuggestedUsers from "./components/SuggestedUsers";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { posts, loading: postsLoading, loadingMore, error, hasMore, refresh, loadMore } = usePosts();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
        <p className="text-zinc-500 text-xs font-medium">Loading Zuvo...</p>
      </div>
    );
  }

  // GUEST LANDING PAGE (Minimalist & Editorial)
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>A focused network for builders & thinkers</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Thoughts & stories, <br className="hidden sm:inline" />
            <span className="text-zinc-500">without the noise.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
            Zuvo is a high-performance publishing platform crafted with zero distractions, atomic performance, and full data ownership.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/auth/register"
              className="btn-primary flex items-center gap-2 !px-6 !py-2.5 font-medium text-xs sm:text-sm"
            >
              Start Writing <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="btn-secondary !px-6 !py-2.5 text-xs sm:text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Minimal Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 w-full text-left">
          <MinimalFeature
            icon={<Zap className="w-4 h-4 text-zinc-200" />}
            title="Fast by Default"
            desc="Under 50ms interactions powered by distributed caching and event streaming."
          />
          <MinimalFeature
            icon={<Shield className="w-4 h-4 text-zinc-200" />}
            title="Zero-Trust Architecture"
            desc="Built with strict schema validation, input scrubbing, and session rotation."
          />
          <MinimalFeature
            icon={<Globe className="w-4 h-4 text-zinc-200" />}
            title="Uncluttered Feed"
            desc="Real-time chronological updates from creators you follow without algorithmic clutter."
          />
        </div>
      </div>
    );
  }

  // AUTHENTICATED TIMELINE
  return (
    <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 items-start justify-between w-full">
      {/* Main Feed Column */}
      <div className="w-full xl:max-w-[620px] 2xl:max-w-[660px] flex-1 min-w-0 space-y-4">
        {/* Composer */}
        <CreatePost onSuccess={refresh} />

        {/* Timeline Feed */}
        {postsLoading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            <p className="text-zinc-500 text-xs">Curating your feed...</p>
          </div>
        ) : error ? (
          <div className="bg-[#111113]/80 border border-white/[0.08] rounded-xl p-8 text-center space-y-3">
            <p className="text-rose-400 text-xs font-medium">{error}</p>
            <button
              onClick={() => refresh()}
              className="btn-secondary !text-xs !py-1.5 !px-4"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    id={post._id}
                    author={post.author.username || "anonymous"}
                    avatar={post.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author._id}`}
                    content={post.content}
                    image={post.image !== "no-photo.jpg" ? post.image : undefined}
                    timestamp={new Date(post.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric"
                    })}
                    likes={post.likesCount}
                    comments={post.commentsCount}
                    tags={post.tags}
                    media={post.media}
                    isOwnPost={isAuthenticated && user?._id === post.author._id}
                  />
                ))}
                <div className="flex justify-center pt-2 pb-6">
                  {hasMore ? (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-all text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? "Loading..." : "Load More"}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-zinc-500 text-xs">You&apos;re all caught up.</span>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-[#111113]/80 border border-white/[0.08] rounded-xl p-12 text-center">
                <p className="text-zinc-500 text-xs">No posts yet. Share an update to start your feed!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar Column - visible on xl screens (1280px+) */}
      <aside className="hidden xl:flex flex-col w-72 2xl:w-80 flex-shrink-0 sticky top-20 space-y-4">
        <TrendingSidebar />
        <SuggestedUsers />
      </aside>
    </div>
  );
}

const MinimalFeature = React.memo(function MinimalFeature({
  icon,
  title,
  desc
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-[#111113]/80 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 space-y-2.5 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-zinc-400 leading-relaxed font-normal">{desc}</p>
    </div>
  );
});
