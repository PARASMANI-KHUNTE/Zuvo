"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "info" | "warning";
}

interface ConfirmationContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType>({ confirm: async () => false });

export const useConfirm = () => useContext(ConfirmationContext);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        // Wait for exit animation to finish before resolving if possible, 
        // but here we resolve immediately and let animation happen
        if (resolver) resolver(result);
        setResolver(null);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {isOpen && options && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => handleClose(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md glass-panel border border-white/10 p-6 rounded-3xl shadow-2xl space-y-6 overflow-hidden"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-2xl ${options.type === "danger" ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"}`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-xl font-bold text-white tracking-tight">{options.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{options.message}</p>
                                </div>
                                <button onClick={() => handleClose(false)} className="p-1 text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => handleClose(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                                >
                                    {options.confirmText || "Cancel"}
                                </button>
                                <button
                                    onClick={() => handleClose(true)}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${options.type === "danger"
                                            ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20"
                                            : "bg-primary hover:bg-primary/80 shadow-primary/20"
                                        }`}
                                >
                                    {options.confirmText || "Confirm"}
                                </button>
                            </div>

                            {/* Decorative background effects */}
                            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl rounded-full -z-10" />
                            <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent/10 blur-3xl rounded-full -z-10" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
}
