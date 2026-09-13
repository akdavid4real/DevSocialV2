import api from "@/lib/api";

export const MISSION_TYPES = ["SOCIAL", "CONTENT", "ENGAGEMENT", "LEARNING", "ACHIEVEMENT"] as const;
export const MISSION_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export const MISSION_DURATIONS = ["DAILY", "WEEKLY", "MONTHLY", "PERMANENT"] as const;

export type MissionType = (typeof MISSION_TYPES)[number];
export type MissionDifficulty = (typeof MISSION_DIFFICULTIES)[number];
export type MissionDuration = (typeof MISSION_DURATIONS)[number];

export interface MissionStep {
    id: string;
    title?: string;
    description?: string;
    metric?: string;
    target?: number;
}

export interface MissionProgressStep {
    stepId: string;
    current: number;
    target: number;
    completed: boolean;
}

export interface MissionProgress {
    id: string;
    userId: string;
    missionId: string;
    status: "ACTIVE" | "COMPLETED" | "PAUSED" | "FAILED";
    currentStep: number;
    stepsCompleted: string[];
    progress: MissionProgressStep[];
    xpEarned: number;
    completedAt?: string;
}

export interface Mission {
    id: string;
    title: string;
    description: string;
    type: MissionType;
    difficulty: MissionDifficulty;
    duration: MissionDuration;
    steps: MissionStep[];
    rewards: {
        xp?: number;
        badge?: string;
        title?: string;
        specialReward?: string;
    };
    prerequisites: string[];
    participantCount: number;
    completionCount: number;
    userProgress?: MissionProgress | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getMissions(params?: { type?: string; difficulty?: string; duration?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
    if (params?.duration) searchParams.set("duration", params.duration);

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<Mission[]>>(`/missions${query ? `?${query}` : ""}`);
    return response.data;
}

export async function joinMission(missionId: string) {
    const response = await api.post<any, ApiResponse<MissionProgress>>(`/missions/${missionId}/join`);
    return response.data;
}

export async function updateMissionProgress(missionId: string, stepId: string, current?: number, completed?: boolean) {
    const response = await api.post<any, ApiResponse<MissionProgress>>(`/missions/${missionId}/progress`, {
        stepId,
        current,
        completed,
    });
    return response.data;
}

export function formatMissionLabel(value: string) {
    return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
