/**
 * API client configuration
 * Centralized axios instance and interceptors
 */
import axios from "axios";

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
    (config) => {
        // TODO: Add token from storage/cookies
        // const token = getToken();
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // TODO: Handle 401, 403, etc.
        return Promise.reject(error);
    }
);
