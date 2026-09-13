import axios from 'axios';
import { API_BASE_URL } from '@/lib/env';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.method === 'get') {
            config.params = { ...config.params, _t: Date.now() };
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response.data || response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
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
