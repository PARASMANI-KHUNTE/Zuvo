import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as Keychain from 'react-native-keychain';
import { errorService } from './errorService';

const BASE_URL = 'http://localhost:3000'; // Replace with your production URL

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const credentials = await Keychain.getGenericPassword();
        if (credentials && credentials.password) {
            // In this setup, we assume access token is in memory or we fetch it from keychain if simplified
            // For production according to plan: Refresh token -> Keychain, Access token -> Memory only.
            // We'll implementation access token storage in a separate service later, for now we use Keychain password field for illustration.
            config.headers.Authorization = `Bearer ${credentials.password}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
        const originalRequest = error.config;
        errorService.trackApiError(error, originalRequest);

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const credentials = await Keychain.getGenericPassword();
                if (!credentials) throw new Error('No refresh token found');

                // Call refresh endpoint
                const response = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken: credentials.username, // Username field stores refresh token
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                // Update Keychain with new refresh token and username
                await Keychain.setGenericPassword(newRefreshToken, accessToken);

                processQueue(null, accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Navigate to login flow logic here
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
