import api from "@/lib/api";

export interface ReferralUser {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    level: number;
}

export interface ReferralItem {
    id: string;
    referrerId: string;
    referredId: string;
    referralCode: string;
    status: "PENDING" | "COMPLETED" | "EXPIRED";
    expiresAt: string;
    completedAt?: string;
    rewardsClaimed: boolean;
    referrerReward: number;
    referredReward: number;
    createdAt: string;
    referred?: ReferralUser | null;
}

export interface ReferralStats {
    stats: Record<"pending" | "completed" | "expired" | "total", { count: number; rewards: number }>;
    recentReferrals: ReferralItem[];
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getReferralCode() {
    const response = await api.get<any, ApiResponse<{ referralCode: string }>>("/referrals/code");
    return response.data;
}

export async function getReferralStats() {
    const response = await api.get<any, ApiResponse<ReferralStats>>("/referrals/stats");
    return response.data;
}

export async function validateReferralCode(referralCode: string) {
    const response = await api.post<any, ApiResponse<{ valid: boolean; referrer?: ReferralUser }>>("/referrals/validate", { referralCode });
    return response.data;
}

export function formatReferralStatus(status: string) {
    return status.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
