import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Endpoints that must never trigger the silent-refresh flow (refresh itself,
// and the flows that already handle their own auth errors).
const NO_REFRESH_PATHS = [
    "/auth/refresh-token",
    "/auth/login",
    "/auth/register",
    "/auth/logout",
];

let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a fresh access token.
 * Single-flight: concurrent 401s share one refresh request.
 */
export const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(
                `${API_BASE_URL}/auth/refresh-token`,
                {},
                { withCredentials: true, headers: { "X-Request-ID": crypto.randomUUID() } }
            )
            .then((res) => {
                const token: string | null = res.data?.accessToken || null;
                if (token) {
                    // AuthContext listens for this and updates its tokenRef/state,
                    // which also refreshes the socket connection.
                    window.dispatchEvent(new CustomEvent("zuvo:token-refreshed", { detail: { accessToken: token } }));
                }
                return token;
            })
            .catch(() => {
                window.dispatchEvent(new CustomEvent("zuvo:session-expired"));
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

// Request Interceptor for Correlation ID
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const requestId = crypto.randomUUID();
    if (config.headers) {
        config.headers["X-Request-ID"] = requestId;
    }
    return config;
});

// Response Interceptor for Global Error Handling + silent token refresh
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: any) => {
        // Suppress intentional abort cancellations and expected 401 unauthenticated checks
        if (axios.isCancel(error) || error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
            return Promise.reject(error);
        }

        const original: RetriableConfig | undefined = error?.config;
        const requestPath: string = original?.url || "";
        const isAuthPath = NO_REFRESH_PATHS.some((path) => requestPath.includes(path));

        if (error.response?.status === 401 && original && !original._retry && !isAuthPath) {
            original._retry = true;
            try {
                const token = await refreshAccessToken();
                if (token && original.headers) {
                    original.headers["Authorization"] = `Bearer ${token}`;
                    return apiClient(original);
                }
            } catch {
                // fall through to rejection below
            }
        }

        if (error.response?.status !== 401) {
            console.error("API Error:", error.response?.data || error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
