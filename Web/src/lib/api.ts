import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor for Correlation ID
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const requestId = crypto.randomUUID();
    if (config.headers) {
        config.headers["X-Request-ID"] = requestId;
    }
    return config;
});

// Response Interceptor for Global Error Handling
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: any) => {
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default apiClient;
