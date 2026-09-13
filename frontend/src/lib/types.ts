export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    affiliation?: string;
    avatar?: string;
    bannerUrl?: string;
    role: 'user' | 'moderator' | 'admin' | 'analytics';
    displayName?: string;
    points: number;
    level: number;
    loginStreak: number;
    lastStreakDate?: string;
    badges: string[];
    followersCount: number;
    followingCount: number;
    isVerified: boolean;
    onboardingCompleted: boolean;
    createdAt?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface AuthResponse {
    user: User;
    session: {
        access_token: string;
        supabase_token: string;
    };
}

export interface LoginCredentials {
    usernameOrEmail: string;
    password: string;
}

export interface SignupData {
    username: string;
    email: string;
    password: string;
    confirmPassword?: string;
    firstName: string;
    lastName: string;
    birthMonth?: number;
    birthDay?: number;
    affiliation?: string;
    affiliationType?: string;
    referralCode?: string;
}
