"use client";
import React from "react";
import { Home, Compass, Bell, MessageSquare, Settings, LogOut, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

import { usePathname } from "next/navigation";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await apiClient.post("/auth/logout");
            logout(); // Clear local state
            router.push("/"); // Show landing page
        } catch (err) {
            console.error("Logout failed:", err);
            logout();
            router.push("/");
        }
    };

    return (
        <aside className="fixed left-0 top-24 bottom-6 w-64 ml-6 hidden lg:flex flex-col gap-6">
            {/* Navigation */}
            <div className="glass-panel p-4 flex flex-col gap-1">
                <SidebarItem icon={<Home className="w-5 h-5" />} label="Home" active={pathname === "/home" || pathname === "/"} onClick={() => router.push("/")} />
                <SidebarItem icon={<Compass className="w-5 h-5" />} label="Explore" active={pathname === "/explore"} onClick={() => router.push("/explore")} />
                <SidebarItem icon={<Bell className="w-5 h-5" />} label="Notifications" active={pathname === "/notifications"} onClick={() => router.push("/notifications")} />
                <SidebarItem icon={<MessageSquare className="w-5 h-5" />} label="Messages" active={pathname === "/messages"} onClick={() => router.push("/messages")} />
            </div>

            {/* User Settings */}
            <div className="glass-panel p-4 flex flex-col gap-1 mt-auto">
                {/* Dummy username used below for preview purposes */}
                <SidebarItem icon={<TrendingUp className="w-5 h-5" />} label="Profile" active={pathname.startsWith("/profile")} onClick={() => router.push("/profile/arivera_dev")} />
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
