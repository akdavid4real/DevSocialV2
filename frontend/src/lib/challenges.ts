import api from "@/lib/api";

export const CHALLENGE_TYPES = ["POST_CREATION", "ENGAGEMENT", "COMMUNITY", "LEARNING", "CREATIVE"] as const;
export const CHALLENGE_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number];

export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: ChallengeType;
    difficulty: ChallengeDifficulty;
    requirements: {
        target?: number;
        metric?: string;
        description?: string;
    };
    rewards: {
        xp?: number;
        badge?: string;
        title?: string;
    };
    startDate: string;
    endDate: string;
    isActive: boolean;
    participantCount: number;
    completionCount: number;
    firstCompletionBonus: number;
    participation?: ChallengeParticipation | null;
}

export interface ChallengeParticipation {
    id: string;
    userId: string;
    challengeId: string;
    status: "ACTIVE" | "COMPLETED" | "PAUSED" | "FAILED";
    progress: number;
    completedAt?: string;
    isFirstCompletion: boolean;
    xpEarned: number;
    submissionData?: Record<string, unknown>;
    challenge?: Challenge;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getActiveChallenges() {
    const response = await api.get<any, ApiResponse<Challenge[]>>("/challenges");
    return response.data;
}

export async function getUserChallenges() {
    const response = await api.get<any, ApiResponse<ChallengeParticipation[]>>("/challenges/user");
    return response.data;
}

export async function joinChallenge(challengeId: string) {
    const response = await api.post<any, ApiResponse<ChallengeParticipation>>(`/challenges/${challengeId}/join`);
    return response.data;
}

export async function submitChallengeProgress(challengeId: string, progress: number, note?: string) {
    const response = await api.post<any, ApiResponse<ChallengeParticipation>>(`/challenges/${challengeId}/submit`, {
        progress,
        submissionData: note ? { note } : undefined,
    });
    return response.data;
}

export function formatChallengeType(type: string) {
    return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatChallengeStatus(status: string) {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
