"use client";
import React from "react";
import { Home, Compass, Bell, MessageSquare, Settings, LogOut, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-24 bottom-6 w-64 ml-6 hidden lg:flex flex-col gap-6">
            {/* Navigation */}
            <div className="glass-panel p-4 flex flex-col gap-1">
                <SidebarItem icon={<Home className="w-5 h-5" />} label="Home" active />
                <SidebarItem icon={<Compass className="w-5 h-5" />} label="Explore" />
                <SidebarItem icon={<Bell className="w-5 h-5" />} label="Notifications" />
                <SidebarItem icon={<MessageSquare className="w-5 h-5" />} label="Messages" />
                <SidebarItem icon={<TrendingUp className="w-5 h-5" />} label="Trends" />
            </div>

            {/* User Settings */}
            <div className="glass-panel p-4 flex flex-col gap-1 mt-auto">
                <SidebarItem icon={<Settings className="w-5 h-5" />} label="Settings" />
                <SidebarItem icon={<LogOut className="w-5 h-5 text-red-400" />} label="Logout" color="text-red-400" />
            </div>
        </aside>
    );
}

function SidebarItem({ icon, label, active = false, color = "text-slate-400" }: { icon: React.ReactNode; label: string; active?: boolean; color?: string }) {
    return (
        <motion.button
            whileHover={{ x: 4 }}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all w-full ${active ? "bg-white/5 text-primary border border-white/10" : `${color} hover:bg-white/5 hover:text-white`}`}
        >
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-neon-cyan" />}
        </motion.button>
    );
}
