"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Search, Bell, MessageSquare, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/context/ToastContext";
import { motion, useAnimation } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
    const router = useRouter();
    const { query, setQuery, loading } = useSearch();
    const { user, isAuthenticated } = useAuth();
    const { socket } = useSocket();
    const { toast } = useToast();
    const [unread, setUnread] = useState(0);
    const controls = useAnimation();

    const shake = async () => {
        await controls.start({
            rotate: [0, -8, 8, -8, 8, 0],
            transition: { duration: 0.4 }
        });
    };

    React.useEffect(() => {
        if (socket) {
            socket.on("notification", (data) => {
                toast(data.content || "Interaction received!", "notification");
                setUnread(prev => prev + 1);
                shake();
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
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-sm tracking-tighter transition-transform group-hover:scale-95">
                        Z
                    </div>
                    <span className="text-base font-semibold tracking-tight text-white">
                        Zuvo
                    </span>
                </Link>

                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-2.5 bg-zinc-900/60 border border-white/[0.08] hover:border-white/[0.14] focus-within:border-white/30 rounded-lg px-3.5 py-1.5 transition-all w-80 lg:w-96">
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin flex-shrink-0" />
                    ) : (
                        <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    )}
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search posts, tags, or creators..."
                        className="bg-transparent border-none outline-none text-xs w-full placeholder:text-zinc-500 text-zinc-200"
                    />
                    <kbd className="hidden lg:inline-flex items-center text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded font-mono">
                        /
                    </kbd>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <>
                            <div className="relative">
                                <NavIconLink
                                    href="/notifications"
                                    icon={
                                        <motion.div animate={controls}>
                                            <Bell className="w-4 h-4" />
                                        </motion.div>
                                    }
                                    title="Notifications"
                                    onClick={() => setUnread(0)}
                                />
                                {unread > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-[#09090b]" />
                                )}
                            </div>
                            <NavIconLink
                                href="/messages"
                                icon={<MessageSquare className="w-4 h-4" />}
                                title="Messages"
                            />

                            <div className="h-4 w-[1px] bg-white/[0.1] mx-1" />

                            <Link
                                href={`/profile/${user?.username}`}
                                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/[0.06] transition-colors"
                                title="My Profile"
                            >
                                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative">
                                    <Image src={userAvatar} alt="profile" fill unoptimized className="object-cover" />
                                </div>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <Link
                                href="/auth/login"
                                className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="btn-primary text-xs !py-1.5 !px-3.5"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

const NavIconLink = React.memo(function NavIconLink({
    href,
    icon,
    title,
    onClick
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            title={title}
            onClick={onClick}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center"
        >
            {icon}
        </Link>
    );
});
