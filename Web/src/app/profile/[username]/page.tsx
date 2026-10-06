"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Calendar, MapPin, Link as LinkIcon, MessageCircle, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import PostCard from "@/app/components/PostCard";
import UserListModal from "@/app/components/UserListModal";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function ProfilePage() {
    const { username } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");
    const [listModal, setListModal] = useState<{ isOpen: boolean; title: string; type: "followers" | "following" }>({
        isOpen: false,
        title: "",
        type: "followers"
    });

    useEffect(() => {
        const abortController = new AbortController();

        const fetchProfile = async () => {
            try {
                setLoading(true);
                // 1. Fetch User Profile
                const userRes = await apiClient.get(`/auth/profile/${username}`, {
                    signal: abortController.signal
                });
                const profileUser = userRes.data.data;
                setUser(profileUser);

                const userId = profileUser._id || profileUser.id;

                // 2. Fetch Relationships and Posts independently
                const [relRes, postsRes] = await Promise.allSettled([
                    apiClient.get(`/interactions/relationships/${userId}`, {
                        signal: abortController.signal
                    }),
                    apiClient.get(`/blogs?author=${userId}`, {
                        signal: abortController.signal
                    })
                ]);

                if (relRes.status === "fulfilled") {
                    setStats(relRes.value.data.data);
                } else {
                    console.error("Failed to fetch relationships", relRes.reason);
                }

                if (postsRes.status === "fulfilled") {
                    setPosts(postsRes.value.data.data || []);
                } else {
                    console.error("Failed to fetch posts", postsRes.reason);
                }

            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchProfile();

        return () => abortController.abort();
    }, [username]);

    const handleFollow = async () => {
        if (!user || following) return;
        setFollowing(true);
        try {
            const res = await apiClient.post("/interactions/follow", { userId: user._id || user.id });
            if (res.data.success) {
                const nowFollowing = res.data.status === "following";
                const wasFollowing = stats.isFollowing;
                setStats(prev => ({
                    ...prev,
                    isFollowing: nowFollowing,
                    followersCount: nowFollowing && !wasFollowing
                        ? prev.followersCount + 1
                        : !nowFollowing && wasFollowing
                            ? prev.followersCount - 1
                            : prev.followersCount
                }));
            }
        } catch (err) {
            console.error("Follow failed", err);
        } finally {
            setFollowing(false);
        }
    };

    const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-500 font-medium tracking-wide">Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <h2 className="text-2xl font-bold text-white">User not found</h2>
                <button onClick={() => router.push("/")} className="btn-primary px-6 py-2">Go Home</button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Banner */}
            <div className="h-44 sm:h-56 w-full bg-zinc-900 rounded-xl relative overflow-hidden border border-white/[0.08]">
                {user.banner ? (
                    <Image src={user.banner} alt="banner" fill unoptimized className="w-full h-full object-cover opacity-70" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-transparent" />
            </div>

            {/* Profile Info */}
            <div className="px-4 sm:px-6 -mt-16 relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex items-end gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-2 border-[#09090b] shadow-xl relative z-20 overflow-hidden flex-shrink-0">
                            <Image src={user.avatar || fallbackAvatar(user.username)} alt={user.name} fill unoptimized className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-0.5 pb-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{user.name}</h1>
                            <p className="text-zinc-500 text-xs">@{user.username}</p>
                        </div>
                    </div>

                    {((currentUser?._id || currentUser?.id) === (user?._id || user?.id)) ? (
                        <button
                            onClick={() => router.push("/settings")}
                            className="btn-secondary !text-xs !py-1.5 !px-4 self-start sm:self-auto"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <button
                                onClick={() => router.push(`/messages?user=${user._id || user.id}`)}
                                className="btn-secondary !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5"
                            >
                                <MessageCircle className="w-3.5 h-3.5" /> Message
                            </button>
                            <button
                                onClick={handleFollow}
                                disabled={following}
                                className={`${stats.isFollowing ? "btn-secondary" : "btn-primary"} !text-xs !py-1.5 !px-4 flex items-center gap-1.5`}
                            >
                                {following ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (stats.isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Unfollow</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>)}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Sidebar Info */}
                    <div className="space-y-4">
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            {user.bio || "No bio yet."}
                        </p>

                        <div className="space-y-2 text-xs text-zinc-400">
                            {user.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {user.location}
                                </div>
                            )}
                            {user.website && (
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline">{user.website.replace("https://", "").replace("http://", "")}</a>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Joined {format(new Date(user.createdAt), "MMMM yyyy")}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2 border-t border-white/[0.06]">
                            <div
                                onClick={() => setListModal({ isOpen: true, title: "Following", type: "following" })}
                                className="flex items-center gap-1.5 cursor-pointer group"
                            >
                                <span className="text-white font-semibold text-xs group-hover:text-zinc-300 transition-colors">{stats.followingCount}</span>
                                <span className="text-zinc-500 text-xs">Following</span>
                            </div>
                            <div
                                onClick={() => setListModal({ isOpen: true, title: "Followers", type: "followers" })}
                                className="flex items-center gap-1.5 cursor-pointer group"
                            >
                                <span className="text-white font-semibold text-xs group-hover:text-zinc-300 transition-colors">{stats.followersCount}</span>
                                <span className="text-zinc-500 text-xs">Followers</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto no-scrollbar">
                            {["posts", "media", "likes"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-xs font-semibold capitalize transition-all relative ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                    {tab}
                                    {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3.5">
                            {activeTab === "posts" && (
                                posts.length > 0 ? (
                                    posts.map(post => <PostCard key={post.id || post._id} {...post} author={user.name} avatar={user.avatar} id={post.id || post._id} likes={post.likesCount || 0} comments={post.commentsCount || 0} timestamp={format(new Date(post.createdAt), "MMM d")} />)
                                ) : (
                                    <div className="bg-[#111113]/80 border border-white/[0.08] rounded-xl p-10 text-center space-y-1.5">
                                        <p className="text-zinc-300 text-xs font-medium">No posts yet</p>
                                        <p className="text-zinc-500 text-[11px]">When {user.username} shares something, it will appear here.</p>
                                    </div>
                                )
                            )}
                            {activeTab === "media" && (
                                <div className="grid grid-cols-2 gap-3">
                                    {posts.filter(p => p.media && p.media.length > 0).map(post => {
                                        const mediaItem = post.media[0];
                                        return (
                                            <div key={post.id || post._id} className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-zinc-950 flex items-center justify-center relative">
                                                {mediaItem.type === "video" ? (
                                                    <video src={mediaItem.url} className="w-full h-full object-cover" muted />
                                                ) : mediaItem.type === "image" ? (
                                                    <Image src={mediaItem.url} alt="Media" fill unoptimized className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-zinc-500 text-xs font-mono uppercase">{mediaItem.type}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {posts.filter(p => p.media && p.media.length > 0).length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-zinc-500 text-xs bg-[#111113]/80 border border-white/[0.08] rounded-xl">No media found</div>
                                    )}
                                </div>
                            )}
                            {activeTab === "likes" && (
                                <LikedPostsTab userId={user._id || user.id} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <UserListModal
                isOpen={listModal.isOpen}
                onClose={() => {
                    setListModal(prev => ({ ...prev, isOpen: false }));
                    const fetchStats = async () => {
                        const userId = user._id || user.id;
                        const relRes = await apiClient.get(`/interactions/relationships/${userId}`);
                        setStats(relRes.data.data);
                    };
                    if (user) fetchStats();
                }}
                title={listModal.title}
                userId={user._id || user.id}
                type={listModal.type}
            />
        </div>
    );
}

function LikedPostsTab({ userId }: { userId: string }) {
    const [likedPosts, setLikedPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchLiked = async () => {
            try {
                const res = await apiClient.get(`/interactions/liked-posts/${userId}`, {
                    signal: abortController.signal
                });
                if (res.data.success) {
                    setLikedPosts(res.data.data || []);
                }
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error("Failed to fetch liked posts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLiked();

        return () => abortController.abort();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (likedPosts.length === 0) {
        return (
            <div className="glass-panel p-10 text-center space-y-2">
                <p className="text-slate-400 font-medium">No liked posts yet</p>
                <p className="text-slate-600 text-xs text-balance">Posts this user likes will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {likedPosts.map((post: any) => (
                <PostCard
                    key={post._id || post.id}
                    id={post._id || post.id}
                    author={post.author?.name || "Unknown"}
                    avatar={post.author?.avatar}
                    title={post.title}
                    content={post.content || ""}
                    image={post.image !== "no-photo.jpg" ? post.image : undefined}
                    media={post.media}
                    likes={post.likesCount || 0}
                    comments={post.commentsCount || 0}
                    tags={post.tags}
                    timestamp={post.createdAt ? format(new Date(post.createdAt), "MMM d") : ""}
                    initialIsLiked
                />
            ))}
        </div>
    );
}
