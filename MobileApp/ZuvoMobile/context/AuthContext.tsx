import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    name?: string;
    username?: string;
    email: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData?: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadToken();
    }, []);

    const loadToken = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (token) {
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

    const login = async (token: string, userData?: any) => {
        await AsyncStorage.setItem('auth_token', token);

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
        await AsyncStorage.removeItem('auth_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
