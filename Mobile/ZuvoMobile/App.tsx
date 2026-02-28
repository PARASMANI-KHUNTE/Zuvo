import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { bootstrap } from './src/app/bootstrap';
import { socketService } from './src/services/socketService';
import { notificationService } from './src/services/notificationService';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000, // 60 seconds
            retry: 2,
        },
    },
});

import { useOfflineStatus } from './src/shared/hooks/useOfflineStatus';
import OfflineBanner from './src/shared/components/OfflineBanner';

function App(): React.JSX.Element {
    const [isInitializing, setIsInitializing] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const isOffline = useOfflineStatus();

    useEffect(() => {
        const init = async () => {
            const result = await bootstrap();
            setIsAuthenticated(result.isAuthenticated);

            if (result.isAuthenticated && !isOffline) {
                await socketService.connect();
                await notificationService.init();
            }

            setIsInitializing(false);
        };

        init();

        return () => {
            socketService.disconnect();
        };
    }, [isOffline]);

    if (isInitializing) {
        return (
            <View style={styles.initializing}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <OfflineBanner isOffline={isOffline} />
            <SafeAreaView style={styles.container}>
                <View>
                    <Text style={styles.title}>Zuvo Mobile</Text>
                    <Text>{isAuthenticated ? 'Welcome Back!' : 'Please Login'}</Text>
                </View>
            </SafeAreaView>
        </QueryClientProvider>
    );
}

const styles = StyleSheet.create({
    initializing: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default App;
