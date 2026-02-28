import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

interface OfflineBannerProps {
    isOffline: boolean;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
    if (!isOffline) return null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.text}>You are offline. Showing cached content.</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#ff4444',
    },
    container: {
        padding: 10,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default OfflineBanner;
