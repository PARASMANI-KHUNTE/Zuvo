import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Href, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const { token, error } = useLocalSearchParams();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        console.log("[LoginScreen] Params:", { token: !!token, error });
        if (error) {
            console.log("[LoginScreen] OAuth error param:", error);
            Alert.alert('Google Sign-In Failed', 'There was an error authenticating with Google.');
        }
    }, [token, error]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            // Send login request to the gateway
            const response = await api.post('/api/v1/auth/login', {
                email,
                password,
            });

            // Backend returns the token as 'accessToken'
            const backendToken = response.data.accessToken;

            if (backendToken) {
                await login(backendToken);
                router.replace('/(tabs)' as Href);
            } else {
                throw new Error("No token received from backend");
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'An error occurred during login.';
            Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const GATEWAY_URL = 'http://localhost:5000';
            // This creates the correct URL for the current environment:
            // - Expo Go: exp://192.168.1.4:8081/--/auth/callback
            // - Standalone: zuvomobile://auth/callback
            const redirectUrl = Linking.createURL('/auth/callback');
            console.log("[LoginScreen] Generated redirectUrl:", redirectUrl);

            // Pass the redirect_uri to the backend so it knows where to send the token back
            const authUrl = `${GATEWAY_URL}/api/v1/auth/google?mobile=true&redirect_uri=${encodeURIComponent(redirectUrl)}`;
            console.log("[LoginScreen] Launching authUrl:", authUrl);

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
            console.log("[LoginScreen] WebBrowser result:", result.type, (result as any).url?.substring(0, 80));

            // Fallback: if deep linking didn't trigger the callback route directly
            if (result.type === 'success' && (result as any).url) {
                const { queryParams } = Linking.parse((result as any).url);
                if (queryParams?.token) {
                    console.log("[LoginScreen] Fallback: got token from result URL");
                    await login(queryParams.token as string);
                    router.replace('/(tabs)' as Href);
                } else if (queryParams?.error) {
                    Alert.alert('Google Sign-In Failed', 'Could not authenticate with Google.');
                }
            }
        } catch (error) {
            console.error('[LoginScreen] Google login error:', error);
            Alert.alert('Error', 'Failed to open Google Sign-In.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="light" />
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue to Zuvo</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="john@example.com"
                        placeholderTextColor="#64748B"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading || googleLoading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
                </View>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleLogin}
                    disabled={loading || googleLoading}
                >
                    {googleLoading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <>
                            <Ionicons name="logo-google" size={20} color="#0F172A" style={styles.googleIcon} />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/auth/register' as Href)}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Slate 900
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#F8FAFC',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    button: {
        backgroundColor: '#3B82F6', // Blue 500
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#334155',
    },
    dividerText: {
        color: '#94A3B8',
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: 'bold',
    },
    googleButton: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    googleIcon: {
        marginRight: 10,
    },
    googleButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    footerLink: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
