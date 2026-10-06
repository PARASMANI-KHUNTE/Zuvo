"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ModalProvider } from "@/context/ModalContext";
import ComposeModal from "./ComposeModal";
import Image from "next/image";
import Link from "next/link";
import { Home, Compass, Bell, User } from "lucide-react";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, user } = useAuth();
    const pathname = usePathname();

    const isAuthPage = pathname?.startsWith("/auth");
    const isShortsPage = pathname === "/shorts";

    return (
        <ModalProvider>
            {!isAuthPage && !isShortsPage && <Navbar />}

            {/* Mobile Bottom Nav */}
            {!isAuthPage && !loading && isAuthenticated && !isShortsPage && (
                <MobileNav user={user} pathname={pathname} />
            )}

            {isAuthPage || isShortsPage ? (
                // Auth & Shorts take direct full container
                <div className="min-h-screen">
                    {children}
                </div>
            ) : (
                // Standard responsive app shell
                <div className="min-h-screen pt-16 pb-20 lg:pb-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-center gap-6 lg:gap-8">
                            {/* Left Navigation Column - Sticky */}
                            {!loading && isAuthenticated && (
                                <aside className="hidden lg:block w-56 xl:w-60 flex-shrink-0">
                                    <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
                                        <Sidebar />
                                    </div>
                                </aside>
                            )}

                            {/* Main Content Area */}
                            <main className="flex-1 min-w-0 max-w-full">
                                {children}
                            </main>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Modals */}
            <ComposeModal />

            {/* Subtle Minimalist Ambient Backdrop */}
            <div className="fixed inset-0 -z-10 bg-[#09090b] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,_rgba(255,255,255,0.02),_transparent)] pointer-events-none" />
        </ModalProvider>
    );
}

// Inline Mobile Bottom Nav Component
function MobileNav({ user, pathname }: { user: any; pathname: string | null }) {
    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-t border-white/[0.08] px-4 py-2 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <Link
                href="/"
                className={`p-2 rounded-lg transition-colors ${pathname === "/" ? "text-white bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <Home className="w-5 h-5" />
            </Link>
            <Link
                href="/explore"
                className={`p-2 rounded-lg transition-colors ${pathname === "/explore" ? "text-white bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <Compass className="w-5 h-5" />
            </Link>
            <Link
                href="/shorts"
                className={`p-2 rounded-lg transition-colors ${pathname === "/shorts" ? "text-white bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m10 8 6 4-6 4V8Z" />
                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                </svg>
            </Link>
            <Link
                href="/notifications"
                className={`p-2 rounded-lg transition-colors ${pathname === "/notifications" ? "text-white bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <Bell className="w-5 h-5" />
            </Link>
            <Link
                href={`/profile/${user?.username || ""}`}
                className={`p-2 rounded-lg transition-colors ${pathname?.includes("/profile") ? "text-white bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                    {user?.avatar ? (
                        <Image src={user.avatar} alt="me" fill unoptimized className="object-cover" />
                    ) : (
                        <User className="w-full h-full p-0.5 text-zinc-400" />
                    )}
                </div>
            </Link>
        </div>
    );
}
