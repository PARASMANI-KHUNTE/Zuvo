"use client";
import React from "react";
import { Search, Bell, MessageSquare, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import Link from "next/link";

export default function Navbar() {
    const router = useRouter();
    const { query, setQuery, loading } = useSearch();
    const { user, isAuthenticated } = useAuth();
    const { socket } = useChat();

    React.useEffect(() => {
        if (socket) {
            socket.on("notification", (data) => {
                alert(`New Notification: ${data.content || "Interaction received!"}`);
            });
            return () => {
                socket.off("notification");
            };
        }
    }, [socket]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const userAvatar = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "me"}`;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-center">
            <div className="max-w-7xl w-full glass-panel px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-neon-cyan">
                        <span className="font-bold text-white">Z</span>
                    </div>
                    <span className="text-xl font-bold tracking-tighter">ZUVO</span>
                </Link>

                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 focus-within:border-primary/50 transition-all w-96">
                    {loading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Search className="w-4 h-4 text-slate-400" />}
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search Zuvo..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-500 text-white"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <>
                            <NavIconLink href="/notifications" icon={<Bell className="w-5 h-5" />} title="Notifications" />
                            <NavIconLink href="/messages" icon={<MessageSquare className="w-5 h-5" />} title="Messages" />
                            <div className="h-8 w-[1px] bg-white/10 mx-1" />
                            <Link href={`/profile/${user?.username}`} className="flex items-center gap-2 hover:opacity-80 transition-all" title="My Profile">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden">
                                    <img src={userAvatar} alt="profile" className="w-full h-full object-cover" />
                                </div>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/auth/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Sign In</Link>
                            <Link href="/auth/register" className="btn-primary px-4 py-2 text-sm font-bold rounded-full">Join Zuvo</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

function NavIconLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
    return (
        <Link href={href} title={title} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
            {icon}
        </Link>
    );
}
