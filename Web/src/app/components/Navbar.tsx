"use client";
import React from "react";
import { Search, Bell, User, MessageSquare, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

export default function Navbar() {
    const { query, setQuery, performSearch, loading } = useSearch();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            performSearch(query);
            // In a real app, you might want to redirect to a search results page
            // router.push(`/search?q=${query}`);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-center">
            <div className="max-w-7xl w-full glass-panel px-6 py-3 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-neon-cyan">
                        <span className="font-bold text-white">Z</span>
                    </div>
                    <span className="text-xl font-bold tracking-tighter">ZUVO</span>
                </div>

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
                <div className="flex items-center gap-4">
                    <NavIcon icon={<MessageSquare className="w-5 h-5" />} />
                    <NavIcon icon={<Bell className="w-5 h-5" />} />
                    <div className="h-8 w-[1px] bg-white/10 mx-2" />
                    <button className="flex items-center gap-2 hover:opacity-80 transition-all">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden">
                            <User className="w-full h-full p-1.5 text-slate-400" />
                        </div>
                    </button>
                </div>
            </div>
        </nav>
    );
}

function NavIcon({ icon }: { icon: React.ReactNode }) {
    return (
        <button className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
            {icon}
        </button>
    );
}
