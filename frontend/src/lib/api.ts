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

// Request interceptor for Auth
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        console.log(`[API DEBUG] ${config.method?.toUpperCase()} ${config.url} | Token exists: ${!!token}`);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Add timestamp to prevent caching
        if (config.method === 'get') {
            config.params = { ...config.params, _t: Date.now() };
        }
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        // Handle both standard axios response and our flattened data from the previous interceptor if any
        return response.data || response;
    },
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        
        if (error.response?.status === 401 && !isLoginRequest) {
            console.warn('[API] 401 Unauthorized detected. Clearing session.');
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error.response?.data || error.message);
    }
);

export const getAffiliations = async () => {
    return api.get('/affiliations');
};

export const getOnboardingStatus = async () => {
    return api.get('/users/onboarding');
};

export const updateOnboarding = async (data: any) => {
    return api.put('/users/onboarding', data);
};

export const verifySignupOtp = async (email: string, token: string) => {
    return api.post('/auth/verify', { email, token });
};

export const requestPasswordReset = async (email: string) => {
    return api.post('/auth/forgot-password', { email });
};

export default api;
