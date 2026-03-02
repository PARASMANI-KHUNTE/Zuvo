"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X, Bell } from "lucide-react";

type ToastType = "success" | "error" | "info" | "notification";

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => { } });

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-primary flex-shrink-0" />,
    notification: <Bell className="w-4 h-4 text-accent flex-shrink-0" />,
};

const BG: Record<ToastType, string> = {
    success: "border-green-500/20 bg-green-500/5",
    error: "border-red-500/20 bg-red-500/5",
    info: "border-primary/20 bg-primary/5",
    notification: "border-accent/20 bg-accent/5",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(err => console.log("Audio play blocked by browser:", err));
        } catch (e) {
            console.error("Audio error", e);
        }
    }, []);

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, type, message }]);

        if (type === "notification") {
            playNotificationSound();
        }

        // Auto-dismiss after 4s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto glass-panel border ${BG[t.type]} rounded-xl px-4 py-3 flex items-start gap-3 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300`}
                    >
                        {ICONS[t.type]}
                        <p className="text-sm text-slate-200 flex-1 leading-snug">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
