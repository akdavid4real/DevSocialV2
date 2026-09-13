"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/lib/navigation';
import api from '@/lib/api';
import { User, AuthResponse, ApiResponse, LoginCredentials, SignupData } from '@/lib/types';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (userData: SignupData) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            // sync internal session with the users/profile endpoint
            const response = await api.get<unknown, ApiResponse<User>>('/users/profile');
            if (response.success && response.data) {
                setUser(response.data);
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('token');
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
                localStorage.setItem('token', response.data.session.access_token);
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

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/auth/login');
        toast.info('Logged out successfully');
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
