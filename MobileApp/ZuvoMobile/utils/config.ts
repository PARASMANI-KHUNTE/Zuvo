import { Platform } from 'react-native';

function getGatewayUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) return envUrl;
    return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}

export const GATEWAY_URL = getGatewayUrl();
