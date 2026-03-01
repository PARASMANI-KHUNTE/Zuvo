import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallback() {
    const { token, error } = useLocalSearchParams();
    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (token && typeof token === 'string') {
            const handleLogin = async () => {
                try {
                    await login(token);
                    router.replace('/(tabs)' as Href);
                } catch {
                    router.replace('/auth/login' as Href);
                }
            };
            handleLogin();
        } else if (error) {
            router.replace('/auth/login' as Href);
        }
    }, [token, error, login, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.text}>Finalizing login...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        marginTop: 20,
        color: '#F8FAFC',
        fontSize: 16,
    }
});
