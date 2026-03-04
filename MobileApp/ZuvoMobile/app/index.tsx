import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

export default function ZuvoSplashScreen() {
    const router = useRouter();
    const { isLoading, user } = useAuth();

    useEffect(() => {
        // Hide the native splash screen as soon as our custom splash mounts
        SplashScreen.hideAsync().catch(() => { });
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (!isLoading) {
            timer = setTimeout(() => {
                if (user) {
                    router.replace('/(tabs)' as Href);
                } else {
                    router.replace('/auth/login' as Href);
                }
            }, 2000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading, user, router]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Text style={styles.text}>Zuvo</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Slate 900
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
});
