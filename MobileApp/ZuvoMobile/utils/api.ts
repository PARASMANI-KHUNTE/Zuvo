import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android emulator it needs to be 10.0.2.2 instead of localhost
// If running on a real device, it requires the actual IP address of the dev machine
const GATEWAY_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if error is 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // In a more complex app, we'd handle token refresh here
      // For now, we'll just clear the token to force re-login
      await AsyncStorage.removeItem('auth_token');
      // Ideally trigger a context update to log out the user
    }
    return Promise.reject(error);
  }
);

export default api;
