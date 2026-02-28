import * as Keychain from 'react-native-keychain';
import apiClient from '../services/apiClient';

export const bootstrap = async () => {
    try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
            // Attempt silent refresh
            try {
                const response = await apiClient.post('/auth/refresh', {
                    refreshToken: credentials.username,
                });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                await Keychain.setGenericPassword(newRefreshToken, accessToken);
                return { isAuthenticated: true };
            } catch (e) {
                console.log('Silent refresh failed', e);
                return { isAuthenticated: false };
            }
        }
        return { isAuthenticated: false };
    } catch (error) {
        console.log('Bootstrap error', error);
        return { isAuthenticated: false };
    }
};
