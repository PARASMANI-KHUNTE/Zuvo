"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ModalProvider } from "@/context/ModalContext";
import ComposeModal from "./ComposeModal";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading, user } = useAuth();
    const pathname = usePathname();

    const isAuthPage = pathname?.startsWith("/auth");

    return (
        <ModalProvider>
            {!isAuthPage && <Navbar />}
            {!isAuthPage && !loading && isAuthenticated && <Sidebar />}

            {/* Mobile Bottom Nav */}
            {!isAuthPage && !loading && isAuthenticated && <MobileNav user={user} />}

            <div className={`${!isAuthPage && !loading && isAuthenticated ? "lg:pl-80 pb-20 lg:pb-0" : ""} ${!isAuthPage ? "pr-6 pl-6 lg:pl-0 pt-24" : ""} max-w-7xl mx-auto transition-all`}>
                {children}
            </div>

            {/* Global Modals */}
            <ComposeModal />

            {/* Background Gradients */}
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,_rgba(112,0,255,0.1),_transparent_50%)] pointer-events-none" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,_rgba(0,242,255,0.05),_transparent_40%)] pointer-events-none" />
        </ModalProvider>
    );
}

// Inline Mobile Nav Component
function MobileNav({ user }: { user: any }) {
    const { pathname } = window.location;
    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 px-6 py-3 flex items-center justify-between pb-safe">
            <a href="/" className={`p-2 ${pathname === '/' ? 'text-primary' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </a>
            <a href="/explore" className={`p-2 ${pathname === '/explore' ? 'text-primary' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
            </a>
            <a href="/shorts" className={`p-2 ${pathname === '/shorts' ? 'text-rose-400' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 8 6 4-6 4V8Z" /><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /></svg>
            </a>
            <a href="/notifications" className={`p-2 ${pathname === '/notifications' ? 'text-primary' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </a>
            <a href={`/profile/${user?.username}`} className={`p-2 ${pathname?.includes('/profile') ? 'text-primary' : 'text-slate-400'}`}>
                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-700 border border-white/20">
                    {user?.avatar
                        ? <img src={user.avatar} alt="me" className="w-full h-full object-cover" />
                        : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-0.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    }
                </div>
            </a>
        </div>
    );
}
