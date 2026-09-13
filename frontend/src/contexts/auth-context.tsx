"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from '@/lib/navigation';
import api from '@/lib/api';
import { setAccessToken } from '@/lib/auth-token';
import { User, AuthResponse, ApiResponse, LoginCredentials, SignupData } from '@/lib/types';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (userData: SignupData) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadUser = useCallback(async () => {
        try {
            const refresh = await api.post<unknown, ApiResponse<AuthResponse>>('/auth/refresh', {});
            const token = refresh.data?.session.access_token;
            if (!refresh.success || !token) {
                setAccessToken(null);
                setUser(null);
                return;
            }

            setAccessToken(token);
            const response = await api.get<unknown, ApiResponse<User>>('/users/profile');
            if (response.success && response.data) {
                setUser(response.data);
            } else {
                setAccessToken(null);
                setUser(null);
            }
        } catch {
            setAccessToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await api.post<unknown, ApiResponse<AuthResponse>>('/auth/login', credentials);
            if (response.success && response.data) {
                setAccessToken(response.data.session.access_token);
                setUser(response.data.user);
                toast.success('Welcome back!');
                router.push('/');
            }
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Login failed');
            toast.error(message);
            throw new Error(message);
        }
    };

    const signup = async (userData: SignupData) => {
        try {
            const response = await api.post<unknown, ApiResponse<User>>('/auth/register', userData);
            if (response.success) {
                toast.success('Registration successful! Please log in.');
                router.push('/auth/login');
            }
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Registration failed');
            toast.error(message);
            throw new Error(message);
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout', {});
        } catch {
            // Clear the client state even if the network request fails.
        } finally {
            setAccessToken(null);
            setUser(null);
            router.push('/auth/login');
            toast.info('Logged out successfully');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object') {
        const maybeError = error as { error?: unknown; message?: unknown };
        if (typeof maybeError.error === 'string') return maybeError.error;
        if (typeof maybeError.message === 'string') return maybeError.message;
        if (Array.isArray(maybeError.message) && typeof maybeError.message[0] === 'string') return maybeError.message[0];
    }

    if (typeof error === 'string') return error;
    return fallback;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
