"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Link as LinkIcon, Edit, UserPlus, FileText, Image as ImageIcon, Heart } from "lucide-react";
import PostCard from "@/app/components/PostCard";

const DUMMY_USER = {
    name: "Alex Rivera",
    username: "arivera_dev",
    bio: "Building the future of the web with Next.js and Neon aesthetics. 🚀 UI/UX Enthusiast.",
    location: "San Francisco, CA",
    website: "https://arivera.dev",
    joinedDate: "October 2023",
    followers: 1205,
    following: 342,
    posts: 48,
    avatar: "https://i.pravatar.cc/150?u=arivera_dev",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
};

const DUMMY_POSTS = [
    {
        _id: "post_1",
        content: "Just launched my new portfolio using Next.js 14 and Tailwind! The glassmorphism and neon accents really make it pop. Let me know what you think! 💻✨",
        author: { name: DUMMY_USER.name, username: DUMMY_USER.username, avatar: DUMMY_USER.avatar },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        likes: ["user1", "user2", "user3"],
        comments: ["comment1", "comment2"],
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop"
    },
    {
        _id: "post_2",
        content: "Anyone else prefer dark mode for literally every app? There is no light mode. Only dark and darker.",
        author: { name: DUMMY_USER.name, username: DUMMY_USER.username, avatar: DUMMY_USER.avatar },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        likes: ["user1", "user2"],
        comments: [],
    }
];

export default function ProfilePage({ params }: { params: { username: string } }) {
    const isOwnProfile = params.username === DUMMY_USER.username;
    const [activeTab, setActiveTab] = useState<"posts" | "media" | "likes">("posts");
    const [isFollowing, setIsFollowing] = useState(false);

    return (
        <div className="w-full max-w-2xl mx-auto pb-20">
            {/* Banner & Avatar Container */}
            <div className="relative mb-16">
                {/* Banner Image */}
                <div className="h-48 md:h-64 w-full rounded-b-2xl overflow-hidden relative">
                    <img
                        src={DUMMY_USER.banner}
                        alt="Profile Banner"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-80" />
                </div>

                {/* Avatar */}
                <div className="absolute -bottom-12 left-6">
                    <div className="w-28 h-28 rounded-full border-4 border-[#020617] overflow-hidden relative group cursor-pointer bg-slate-800">
                        <img
                            src={DUMMY_USER.avatar}
                            alt={DUMMY_USER.name}
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Actions */}
                <div className="absolute -bottom-10 right-6 flex gap-3">
                    {isOwnProfile ? (
                        <button className="glass-panel px-6 py-2 rounded-full font-bold text-sm border-white/10 hover:bg-white/10 transition-colors">
                            Edit Profile
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsFollowing(!isFollowing)}
                            className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${isFollowing
                                ? "glass-panel border-white/10 text-white hover:bg-white/5"
                                : "btn-primary"
                                }`}
                        >
                            {!isFollowing && <UserPlus className="w-4 h-4" />}
                            {isFollowing ? "Following" : "Follow"}
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Info */}
            <div className="px-6 space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">{DUMMY_USER.name}</h1>
                    <p className="text-slate-400">@{params.username}</p>
                </div>

                <p className="text-slate-200 text-sm leading-relaxed">{DUMMY_USER.bio}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {DUMMY_USER.location}</div>
                    <div className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> <a href={DUMMY_USER.website} className="text-primary hover:underline">{new URL(DUMMY_USER.website).hostname}</a></div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined {DUMMY_USER.joinedDate}</div>
                </div>

                <div className="flex gap-6 text-sm pt-2">
                    <div className="group cursor-pointer">
                        <span className="font-bold text-white group-hover:text-primary transition-colors">{DUMMY_USER.following}</span> <span className="text-slate-400">Following</span>
                    </div>
                    <div className="group cursor-pointer">
                        <span className="font-bold text-white group-hover:text-primary transition-colors">{DUMMY_USER.followers}</span> <span className="text-slate-400">Followers</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 border-b border-white/5 flex">
                <button
                    onClick={() => setActiveTab("posts")}
                    className={`flex-1 py-4 text-sm font-bold relative transition-colors ${activeTab === 'posts' ? 'text-primary' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> Posts
                    </div>
                    {activeTab === 'posts' && <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("media")}
                    className={`flex-1 py-4 text-sm font-bold relative transition-colors ${activeTab === 'media' ? 'text-primary' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Media
                    </div>
                    {activeTab === 'media' && <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("likes")}
                    className={`flex-1 py-4 text-sm font-bold relative transition-colors ${activeTab === 'likes' ? 'text-primary' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Heart className="w-4 h-4" /> Likes
                    </div>
                    {activeTab === 'likes' && <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6 px-4 space-y-4">
                {activeTab === "posts" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {DUMMY_POSTS.map(post => (
                            <PostCard
                                key={post._id}
                                author={post.author.name}
                                avatar={post.author.avatar}
                                content={post.content}
                                image={post.image}
                                timestamp={new Date(post.createdAt).toLocaleDateString()}
                                likes={post.likes.length}
                                comments={post.comments.length}
                            />
                        ))}
                    </motion.div>
                )}

                {activeTab === "media" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2">
                        {DUMMY_POSTS.filter(p => p.image).map(post => (
                            <div key={`media-${post._id}`} className="aspect-square rounded-xl overflow-hidden glass-panel group cursor-pointer relative">
                                <img src={post.image} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === "likes" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <Heart className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-slate-400">No recent likes to show.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
