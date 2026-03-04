import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Href, useLocalSearchParams } from 'expo-router';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const { token, error } = useLocalSearchParams();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        const handleDeepLinkToken = async () => {
            if (token && typeof token === 'string') {
                try {
                    await login(token);
                    router.replace('/(tabs)' as Href);
                } catch (e) {
                    Alert.alert('OAuth Error', 'Failed to save login token from Google.');
                }
            }
            if (error) {
                Alert.alert('Google Sign-In Failed', 'There was an error authenticating with Google.');
            }
        };
        handleDeepLinkToken();
    }, [token, error]);

    // Regex matches backend: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    const validatePassword = (pass: string) => {
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        return re.test(pass);
    };

    const handleRegister = async () => {
        if (!name || !username || !email || !password) {
            Alert.alert('Error', 'All fields are required.');
            return;
        }

        if (password.length < 8 || !validatePassword(password)) {
            Alert.alert(
                'Weak Password',
                'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
            );
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/api/v1/auth/register', {
                name,
                username,
                email,
                password,
            });

            if (response.status === 201) {
                Alert.alert(
                    'Success!',
                    'Your account has been created successfully. Please head to login.',
                    [{ text: 'OK', onPress: () => router.replace('/auth/login' as Href) }]
                );
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'An error occurred during registration.';
            Alert.alert('Registration Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setGoogleLoading(true);
        try {
            const GATEWAY_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
            const redirectUrl = Linking.createURL('/auth/callback');
            const authUrl = `${GATEWAY_URL}/api/v1/auth/google?mobile=true`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

            if (result.type === 'success' && result.url) {
                const { queryParams } = Linking.parse(result.url);
                if (queryParams?.token) {
                    await login(queryParams.token as string);
                    router.replace('/(tabs)' as Href);
                } else if (queryParams?.error) {
                    Alert.alert('Google Sign-In Failed', 'Could not authenticate.');
                }
            }
        } catch (error) {
            console.error(error);
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Zuvo today</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            placeholderTextColor="#64748B"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="johndoe123"
                            placeholderTextColor="#64748B"
                            autoCapitalize="none"
                            value={username}
                            onChangeText={setUsername}
                        />
                    </View>

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
                        <Text style={styles.hint}>Must contain 8+ chars, 1 uppercase, 1 lowercase, 1 number</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleRegister}
                        disabled={loading || googleLoading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.divider} />
                    </View>

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignup}
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
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/login' as Href)}>
                            <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
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
        marginBottom: 32,
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
    hint: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 6,
    },
    button: {
        backgroundColor: '#3B82F6',
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
