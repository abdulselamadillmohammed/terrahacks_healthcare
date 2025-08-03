import axios from "axios";
import * as SecureStore from "expo-secure-store";

// School | Home
// 100.100.22.169 | 10.0.0.249 |
// https://fd9fea87362e.ngrok-free.app
// const API_BASE_URL = "http://100.100.22.169:8000/api/"; // EXAMPLE! Use your actual IP or ngrok URL.
const API_BASE_URL = "https://8b285d984713.ngrok-free.app/api/";

// --- 1. LOG THE BASE URL ON APP START ---
console.log(`[apiClient] Initializing with API_BASE_URL: ${API_BASE_URL}`);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Add a 10-second timeout
});

// --- 2. LOG EVERY OUTGOING REQUEST ---
apiClient.interceptors.request.use(
  async (config) => {
    console.log(
      `[apiClient] Making request to: ${config.method.toUpperCase()} ${
        config.baseURL
      }${config.url}`
    );

    const accessToken = await SecureStore.getItemAsync("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 2. Response Interceptor ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) {
          console.log("[apiClient] No refresh token found, logging out.");
          return Promise.reject(error);
        }

        // Use the refresh token to get a new access token
        const refreshUrl = `${API_BASE_URL}token/refresh/`;
        console.log(
          `[apiClient] Attempting to refresh token at: ${refreshUrl}`
        );
        const response = await axios.post(refreshUrl, {
          refresh: refreshToken,
        });

        const { access: newAccessToken, refresh: newRefreshToken } =
          response.data;

        await SecureStore.setItemAsync("accessToken", newAccessToken);
        await SecureStore.setItemAsync("refreshToken", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error(
          "[apiClient] Refresh token is invalid. Logging out.",
          refreshError
        );
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
