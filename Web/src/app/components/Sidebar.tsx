"use client";
import React from "react";
import Image from "next/image";
import { Home, Compass, Bell, MessageSquare, Settings, LogOut, User, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useModals } from "@/context/ModalContext";

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
        <div className="flex flex-col gap-3 w-full">
            {/* Navigation Card */}
            <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-2 flex flex-col gap-0.5">
                <SidebarItem
                    icon={<Home className="w-4 h-4" />}
                    label="Home"
                    active={pathname === "/" || pathname === "/home"}
                    onClick={() => router.push("/")}
                />
                <SidebarItem
                    icon={<Compass className="w-4 h-4" />}
                    label="Explore"
                    active={pathname === "/explore"}
                    onClick={() => router.push("/explore")}
                />
                <SidebarItem
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m10 8 6 4-6 4V8Z" />
                            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                        </svg>
                    }
                    label="Shorts"
                    active={pathname === "/shorts"}
                    onClick={() => router.push("/shorts")}
                />
                <SidebarItem
                    icon={<Bell className="w-4 h-4" />}
                    label="Notifications"
                    active={pathname === "/notifications"}
                    onClick={() => router.push("/notifications")}
                />
                <SidebarItem
                    icon={<MessageSquare className="w-4 h-4" />}
                    label="Messages"
                    active={pathname === "/messages"}
                    onClick={() => router.push("/messages")}
                />

                <div className="pt-2 mt-1 border-t border-white/[0.06]">
                    <button
                        onClick={() => openModal("compose")}
                        className="w-full py-2.5 px-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition-all font-medium text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Post</span>
                    </button>
                </div>
            </div>

            {/* Profile & Settings Section */}
            <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-2 flex flex-col gap-0.5">
                {user?.username && (
                    <SidebarItem
                        icon={
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                                {user.avatar ? (
                                    <Image src={user.avatar} alt="me" fill unoptimized className="object-cover" />
                                ) : (
                                    <User className="w-full h-full p-0.5 text-zinc-400" />
                                )}
                            </div>
                        }
                        label="Profile"
                        active={pathname === `/profile/${user.username}`}
                        onClick={() => router.push(`/profile/${user.username}`)}
                    />
                )}
                <SidebarItem
                    icon={<Settings className="w-4 h-4" />}
                    label="Settings"
                    active={pathname === "/settings"}
                    onClick={() => router.push("/settings")}
                />
                <SidebarItem
                    icon={<LogOut className="w-4 h-4 text-zinc-500" />}
                    label="Logout"
                    onClick={handleLogout}
                    textColor="text-zinc-500 hover:text-rose-400"
                />
            </div>
        </div>
    );
}

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    textColor?: string;
    onClick?: () => void;
}

const SidebarItem = React.memo(function SidebarItem({
    icon,
    label,
    active = false,
    textColor,
    onClick,
}: SidebarItemProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full text-left ${
                active
                    ? "bg-white/[0.08] text-white"
                    : textColor || "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
        >
            <span className={active ? "text-white" : "text-zinc-400"}>{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );
});
