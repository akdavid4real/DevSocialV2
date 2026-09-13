import api from "@/lib/api";

export const FEEDBACK_TYPES = ["BUG", "FEATURE", "GENERAL", "IMPROVEMENT"] as const;
export const FEEDBACK_STATUSES = ["OPEN", "IN_PROGRESS", "SOLVED"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export interface FeedbackUser {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
    level: number;
}

export interface FeedbackComment {
    id: string;
    feedbackId: string;
    userId: string;
    content: string;
    isAdminComment: boolean;
    createdAt: string;
    user?: FeedbackUser | null;
}

export interface FeedbackItem {
    id: string;
    userId: string;
    type: FeedbackType;
    subject: string;
    description: string;
    rating?: number;
    status: FeedbackStatus;
    commentsCount: number;
    solvedById?: string;
    solvedAt?: string;
    createdAt: string;
    updatedAt: string;
    user?: FeedbackUser | null;
    solvedBy?: FeedbackUser | null;
    comments?: FeedbackComment[];
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getFeedback(params?: {
    view?: "my" | "all";
    search?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
}) {
    const searchParams = new URLSearchParams();
    if (params?.view) searchParams.set("view", params.view);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<{
        feedback: FeedbackItem[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/feedback${query ? `?${query}` : ""}`);

    return response.data;
}

export async function createFeedback(input: {
    type: FeedbackType;
    subject: string;
    description: string;
    rating?: number;
}) {
    const response = await api.post<any, ApiResponse<FeedbackItem>>("/feedback", input);
    return response.data;
}

export async function getFeedbackItem(id: string) {
    const response = await api.get<any, ApiResponse<FeedbackItem>>(`/feedback/${id}`);
    return response.data;
}

export async function createFeedbackComment(id: string, content: string) {
    const response = await api.post<any, ApiResponse<FeedbackComment>>(`/feedback/${id}/comments`, { content });
    return response.data;
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    const response = await api.patch<any, ApiResponse<FeedbackItem>>(`/feedback/${id}/status`, { status });
    return response.data;
}

export function formatFeedbackType(type: string) {
    return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatFeedbackStatus(status: string) {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
