import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GATEWAY_URL } from './config';

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const NO_REFRESH_PATHS = ['/api/v1/auth/refresh-token', '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/logout'];

const api = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Tells the auth service to return the refresh token in the response body
    // (native apps cannot use the httpOnly cookie the web client relies on).
    'X-Client-Platform': 'mobile',
  },
});

type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();

/** Notified when the session could not be restored (user must sign in again). */
export const onSessionExpired = (listener: SessionListener) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

const emitSessionExpired = () => {
  sessionListeners.forEach((listener) => listener());
};

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<string | null> | null = null;

/** Single-flight token refresh: concurrent 401s share one refresh request. */
const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return null;

        const { data } = await axios.post(
          `${GATEWAY_URL}/api/v1/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json', 'X-Client-Platform': 'mobile' }, timeout: 15000 }
        );

        if (data?.success && data?.accessToken) {
          await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          return data.accessToken;
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    const status = error.response?.status;
    const url = original?.url || '';

    if (status === 401 && original && !original._retry && !NO_REFRESH_PATHS.some((p) => url.includes(p))) {
      original._retry = true;
      const accessToken = await refreshAccessToken();

      if (accessToken) {
        // Drop the stale header; the request interceptor re-attaches the new token.
        const headers = original.headers as { delete?: (name: string) => void } & Record<string, unknown>;
        if (headers && typeof headers.delete === 'function') {
          headers.delete('Authorization');
          headers.delete('authorization');
        } else if (headers) {
          delete headers.Authorization;
          delete headers.authorization;
        }
        return api(original);
      }

      // Refresh failed: drop stale credentials and force a new sign-in.
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      emitSessionExpired();
    }

    return Promise.reject(error);
  }
);

export const storeTokens = async (accessToken: string, refreshToken?: string) => {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

export default api;
