"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, MapPin, Link as LinkIcon, MessageCircle, UserPlus, UserMinus, Loader2, Image as ImageIcon } from "lucide-react";
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
        const fetchProfile = async () => {
            try {
                setLoading(true);
                // 1. Fetch User Profile
                const userRes = await apiClient.get(`/auth/profile/${username}`);
                const profileUser = userRes.data.data;
                setUser(profileUser);

                const userId = profileUser._id || profileUser.id;

                // 2. Fetch Relationships and Posts independently
                const [relRes, postsRes] = await Promise.allSettled([
                    apiClient.get(`/interactions/relationships/${userId}`),
                    apiClient.get(`/blogs?author=${userId}`)
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

            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchProfile();
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
        <div className="max-w-4xl mx-auto pb-20">
            {/* Banner */}
            <div className="h-48 md:h-64 w-full bg-slate-800 rounded-b-3xl relative overflow-hidden group">
                <img src={user.banner} alt="banner" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Profile Info */}
            <div className="px-6 -mt-16 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="w-32 h-32 md:-mt-16 rounded-3xl bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl relative z-20 overflow-hidden">
                            <img src={user.avatar || fallbackAvatar(user.username)} alt={user.name} className="w-full h-full object-cover rounded-[22px] border-4 border-[#020617]" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-white tracking-tight">{user.name}</h1>
                            <p className="text-primary font-medium">@{user.username}</p>
                        </div>
                    </div>

                    {((currentUser?._id || currentUser?.id) === (user?._id || user?.id)) ? (
                        <button
                            onClick={() => router.push("/settings")}
                            className="bg-slate-800 text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center gap-2 border border-white/10"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(`/messages?user=${user._id || user.id}`)}
                                className="glass-panel px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4" /> Message
                            </button>
                            <button
                                onClick={handleFollow}
                                disabled={following}
                                className={`${stats.isFollowing ? "bg-slate-800 text-white" : "btn-primary"} px-8 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2`}
                            >
                                {following ? <Loader2 className="w-4 h-4 animate-spin" /> : (stats.isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>)}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {user.bio || "No bio yet."}
                        </p>

                        <div className="space-y-3">
                            {user.location && (
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <MapPin className="w-4 h-4 text-primary/60" /> {user.location}
                                </div>
                            )}
                            {user.website && (
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                    <LinkIcon className="w-4 h-4 text-primary/60" />
                                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{user.website.replace("https://", "").replace("http://", "")}</a>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                <Calendar className="w-4 h-4 text-primary/60" /> Joined {format(new Date(user.createdAt), "MMMM yyyy")}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <div
                                onClick={() => setListModal({ isOpen: true, title: "Following", type: "following" })}
                                className="flex flex-col cursor-pointer group"
                            >
                                <span className="text-white font-black text-lg group-hover:text-primary transition-colors">{stats.followingCount}</span>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Following</span>
                            </div>
                            <div
                                onClick={() => setListModal({ isOpen: true, title: "Followers", type: "followers" })}
                                className="flex flex-col cursor-pointer group"
                            >
                                <span className="text-white font-black text-lg group-hover:text-primary transition-colors">{stats.followersCount}</span>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Followers</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-1 overflow-x-auto no-scrollbar">
                            {["posts", "media", "likes"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? "text-primary" : "text-slate-500 hover:text-white"}`}
                                >
                                    {tab}
                                    {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeTab === "posts" && (
                                posts.length > 0 ? (
                                    posts.map(post => <PostCard key={post.id || post._id} {...post} author={user.name} avatar={user.avatar} id={post.id || post._id} timestamp={format(new Date(post.createdAt), "MMM d")} />)
                                ) : (
                                    <div className="glass-panel p-10 text-center space-y-2">
                                        <p className="text-slate-400 font-medium">No posts yet</p>
                                        <p className="text-slate-600 text-xs text-balance">When {user.username} shares something, it will appear here.</p>
                                    </div>
                                )
                            )}
                            {activeTab === "media" && (
                                <div className="grid grid-cols-2 gap-4">
                                    {posts.filter(p => p.media && p.media.length > 0).map(post => {
                                        const mediaItem = post.media[0];
                                        return (
                                            <div key={post.id || post._id} className="aspect-square rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-white/20 transition-all bg-slate-900 flex items-center justify-center">
                                                {mediaItem.type === "video" ? (
                                                    <video src={mediaItem.url} className="w-full h-full object-cover opacity-80" muted />
                                                ) : mediaItem.type === "image" ? (
                                                    <img src={mediaItem.url} alt="Media" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-slate-500 font-bold uppercase">{mediaItem.type}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {posts.filter(p => p.media && p.media.length > 0).length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-slate-500 text-sm glass-panel rounded-2xl">No media found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <UserListModal
                isOpen={listModal.isOpen}
                onClose={() => {
                    setListModal(prev => ({ ...prev, isOpen: false }));
                    // Refresh stats when modal closes to sync follow counts
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
