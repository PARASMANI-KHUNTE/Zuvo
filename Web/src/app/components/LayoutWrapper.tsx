"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ModalProvider } from "@/context/ModalContext";
import ComposeModal from "./ComposeModal";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();

    return (
        <ModalProvider>
            <Navbar />
            {!loading && isAuthenticated && <Sidebar />}
            <div className={`${!loading && isAuthenticated ? "lg:pl-80" : ""} pr-6 max-w-7xl mx-auto transition-all`}>
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
