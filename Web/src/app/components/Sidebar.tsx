"use client";
import React from "react";
import { Home, Compass, Bell, MessageSquare, Settings, LogOut, User, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModals } from "@/context/ModalContext";
import Link from "next/link";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { openModal } = useModals();

    const handleLogout = async () => {
        try {
            await apiClient.post("/auth/logout");
        } catch (err) {
            // ignore
        } finally {
            logout();
            router.push("/");
        }
    };

    return (
        <aside className="fixed left-0 top-24 bottom-6 w-64 ml-6 hidden lg:flex flex-col gap-6">
            {/* Navigation */}
            <div className="flex flex-col gap-4">
                <div className="glass-panel p-4 flex flex-col gap-1">
                    <SidebarItem icon={<Home className="w-5 h-5" />} label="Home" active={pathname === "/" || pathname === "/home"} onClick={() => router.push("/")} />
                    <SidebarItem icon={<Compass className="w-5 h-5" />} label="Explore" active={pathname === "/explore"} onClick={() => router.push("/explore")} />
                    <SidebarItem icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 8 6 4-6 4V8Z" /><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /></svg>} label="Shorts" active={pathname === "/shorts"} onClick={() => router.push("/shorts")} color="text-rose-400" />
                    <SidebarItem icon={<Bell className="w-5 h-5" />} label="Notifications" active={pathname === "/notifications"} onClick={() => router.push("/notifications")} />
                    <SidebarItem icon={<MessageSquare className="w-5 h-5" />} label="Messages" active={pathname === "/messages"} onClick={() => router.push("/messages")} />
                </div>

                <button
                    onClick={() => openModal("compose")}
                    className="btn-primary w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-neon-blue group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Post</span>
                </button>
            </div>

            {/* User / Settings Section  */}
            <div className="glass-panel p-4 flex flex-col gap-1 mt-auto">
                {/* Profile link using real username */}
                {user?.username && (
                    <SidebarItem
                        icon={
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 border border-white/10 flex-shrink-0">
                                {user.avatar
                                    ? <img src={user.avatar} alt="me" className="w-full h-full object-cover" />
                                    : <User className="w-full h-full p-0.5 text-slate-400" />
                                }
                            </div>
                        }
                        label="Profile"
                        active={pathname === `/profile/${user.username}`}
                        onClick={() => router.push(`/profile/${user.username}`)}
                    />
                )}
                <SidebarItem icon={<Settings className="w-5 h-5" />} label="Settings" active={pathname === "/settings"} onClick={() => router.push("/settings")} />
                <SidebarItem
                    icon={<LogOut className="w-5 h-5 text-red-400" />}
                    label="Logout"
                    color="text-red-400"
                    onClick={handleLogout}
                />
            </div>
        </aside>
    );
}

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    color?: string;
    onClick?: () => void;
}

function SidebarItem({ icon, label, active = false, color = "text-slate-400", onClick }: SidebarItemProps) {
    return (
        <motion.button
            whileHover={{ x: 4 }}
            onClick={onClick}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all w-full ${active ? "bg-white/5 text-primary border border-white/10" : `${color} hover:bg-white/5 hover:text-white`}`}
        >
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-neon-cyan" />}
        </motion.button>
    );
}
