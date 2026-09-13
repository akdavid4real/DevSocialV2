import axios from 'axios';
import { API_BASE_URL } from '@/lib/env';
import { getAccessToken, setAccessToken } from '@/lib/auth-token';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
});

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.method === 'get') {
        config.params = { ...config.params, _t: Date.now() };
    }
    return config;
});

api.interceptors.response.use(
    (response) => response.data || response,
    async (error) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        const url = originalRequest?.url || '';
        const isAuthBootstrap = url.includes('/auth/login') || url.includes('/auth/refresh');

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthBootstrap) {
            originalRequest._retry = true;
            try {
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true },
                );
                const token = refreshResponse.data?.data?.session?.access_token;
                if (token) {
                    setAccessToken(token);
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    const retryResponse = await api.request(originalRequest);
                    return retryResponse;
                }
            } catch {
                // Fall through to clear the local in-memory session.
            }

            setAccessToken(null);
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
        }

        return Promise.reject(error.response?.data || error.message);
    }
);

export const getAffiliations = async () => api.get('/affiliations');
export const getOnboardingStatus = async () => api.get('/users/onboarding');
export const updateOnboarding = async (data: any) => api.put('/users/onboarding', data);
export const verifySignupOtp = async (email: string, token: string) => api.post('/auth/verify', { email, token });
export const requestPasswordReset = async (email: string) => api.post('/auth/forgot-password', { email });

export default api;
