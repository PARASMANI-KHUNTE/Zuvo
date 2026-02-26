"use client";
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import apiClient from "@/lib/api";

interface User {
    _id: string;
    username: string;
    email: string;
    name: string;
    avatar?: string;
    role?: string;
    isVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    accessToken: string | null;
    login: (userData: User, token: string) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // Keep a ref so the axios interceptor always sees the latest token
    const tokenRef = useRef<string | null>(null);
    const authPromiseRef = useRef<Promise<void> | null>(null);

    // Wire the token into every outgoing request
    useEffect(() => {
        const interceptor = apiClient.interceptors.request.use(config => {
            const token = tokenRef.current;
            if (token && config.headers) {
                config.headers["Authorization"] = `Bearer ${token}`;
            }
            return config;
        });
        return () => apiClient.interceptors.request.eject(interceptor);
    }, []);

    const checkAuth = async () => {
        // Prevent strictly concurrent checkAuth calls (e.g. React Strict Mode double-mounts)
        if (authPromiseRef.current) return authPromiseRef.current;

        const executeAuth = async () => {
            try {
                setLoading(true);
                // Try to refresh first to get a new access token from the httpOnly cookie
                const refreshRes = await apiClient.post("/auth/refresh-token");
                if (refreshRes.data?.accessToken) {
                    tokenRef.current = refreshRes.data.accessToken;
                    setAccessToken(refreshRes.data.accessToken);

                    // Now fetch user profile
                    const meRes = await apiClient.get("/auth/me");
                    if (meRes.data.success) {
                        setUser(meRes.data.data);
                    } else {
                        setUser(null);
                        tokenRef.current = null;
                        setAccessToken(null);
                    }
                } else {
                    setUser(null);
                    tokenRef.current = null;
                    setAccessToken(null);
                }
            } catch {
                // No valid session — guest mode
                setUser(null);
                tokenRef.current = null;
                setAccessToken(null);
            } finally {
                setLoading(false);
                authPromiseRef.current = null; // Free the lock
            }
        };

        authPromiseRef.current = executeAuth();
        return authPromiseRef.current;
    };

    const login = (userData: User, token: string) => {
        tokenRef.current = token;
        setAccessToken(token);
        setUser(userData);
    };

    const logout = async () => {
        try {
            await apiClient.post("/auth/logout");
        } catch { /* ignore */ }
        tokenRef.current = null;
        setAccessToken(null);
        setUser(null);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated: !!user,
            accessToken,
            login,
            logout,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
