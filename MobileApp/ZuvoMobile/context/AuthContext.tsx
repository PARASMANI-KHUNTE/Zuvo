import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { clearTokens, onSessionExpired, storeTokens, default as api } from '../utils/api';

interface User {
    id: string;
    name?: string;
    username?: string;
    email: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    login: (token: string, userData?: any, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadToken();
    }, []);

    // Refresh failed somewhere in the API layer: the user must sign in again.
    useEffect(() => {
        return onSessionExpired(() => {
            setAccessToken(null);
            setUser(null);
        });
    }, []);

    const loadToken = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
                setAccessToken(token);
                // Option 1: Decode JWT to get user info if the payload has it
                try {
                    const decoded: any = jwtDecode(token);
                    // Assuming the token has at least 'id', 'email', etc.
                    // Fallback to minimal user structure if exactly not known
                    setUser({
                        id: decoded.id || decoded.sub || 'user_id',
                        email: decoded.email || '',
                        name: decoded.name || 'User',
                    });
                } catch (e) {
                    console.error("[AuthContext] Failed to decode token", e);
                    // If decode fails, just set a placeholder user to indicate logged in state
                    setUser({ id: 'active', email: 'user@zuvo.com' });
                }
            }
        } catch (error) {
            console.error('[AuthContext] Error loading token:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (token: string, userData?: any, refreshToken?: string) => {
        await storeTokens(token, refreshToken);
        setAccessToken(token);

        if (userData) {
            setUser(userData);
        } else {
            // Attempt to decode
            try {
                const decoded: any = jwtDecode(token);
                setUser({
                    id: decoded.id || decoded.sub || 'user_id',
                    email: decoded.email || '',
                    name: decoded.name || 'User',
                });
            } catch {
                // fallback
                setUser({ id: 'active', email: 'user@zuvo.com' });
            }
        }
    };

    const logout = async () => {
        // Best effort: revoke the refresh session server-side before clearing local state.
        try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            await api.post('/api/v1/auth/logout', refreshToken ? { refreshToken } : {});
        } catch {
            // Session may already be invalid; local sign-out still proceeds.
        }
        await clearTokens();
        setAccessToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
