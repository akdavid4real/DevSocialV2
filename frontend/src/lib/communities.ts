import api from "@/lib/api";

export const COMMUNITY_CATEGORIES = [
    "FRONTEND",
    "BACKEND",
    "MOBILE",
    "DEVOPS",
    "DATA",
    "AI",
    "BLOCKCHAIN",
    "GENERAL",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export interface Community {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: CommunityCategory;
    tags: string[];
    rules: string[];
    creatorId: string;
    isPrivate: boolean;
    memberCount: number;
    postCount: number;
    memberIds: string[];
    members: Array<{ userId: string; role: "MEMBER" | "MODERATOR" | "CREATOR" }>;
    createdAt: string;
    isJoined?: boolean;
    canViewContent?: boolean;
    requestId?: string | null;
    requestStatus?: string | null;
    inviteId?: string | null;
    inviteStatus?: string | null;
}

export interface CommunityJoinRequest {
    id: string;
    status: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        displayName?: string | null;
        avatar?: string;
        level?: number;
    };
}

export interface CommunityInvite {
    id: string;
    status: string;
    createdAt: string;
    community: {
        id: string;
        name: string;
        slug: string;
        avatar?: string | null;
    };
    inviter: {
        id: string;
        username: string;
        displayName?: string | null;
    };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getCommunities(params?: { search?: string; category?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<{
        communities: Community[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/communities${query ? `?${query}` : ""}`);

    return response.data;
}

export async function createCommunity(input: {
    name: string;
    description: string;
    category: CommunityCategory;
    tags: string[];
    rules: string[];
    isPrivate: boolean;
}) {
    const response = await api.post<any, ApiResponse<Community>>("/communities", input);
    return response.data;
}

export async function getCommunity(idOrSlug: string) {
    const response = await api.get<any, ApiResponse<Community>>(`/communities/${idOrSlug}`);
    return response.data;
}

export async function toggleCommunityMembership(idOrSlug: string) {
    const response = await api.post<any, ApiResponse<{
        isJoined: boolean;
        requested?: boolean;
        requestId?: string | null;
        requestStatus?: string | null;
        memberCount: number;
        community: Community;
    }>>(`/communities/${idOrSlug}/join`);
    return response.data;
}

export async function cancelCommunityJoinRequest(requestId: string) {
    await api.delete(`/communities/join-requests/${requestId}`);
}

export async function getCommunityJoinRequests(idOrSlug: string) {
    const response = await api.get<any, ApiResponse<{
        requests: CommunityJoinRequest[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/communities/${idOrSlug}/join-requests`);
    return response.data;
}

export async function reviewCommunityJoinRequest(idOrSlug: string, requestId: string, accept: boolean) {
    await api.post(`/communities/${idOrSlug}/join-requests/${requestId}/${accept ? "accept" : "reject"}`);
}

export async function inviteUserToCommunity(idOrSlug: string, userId: string) {
    return api.post(`/communities/${idOrSlug}/invites/${userId}`);
}

export async function getCommunityInvitations() {
    const response = await api.get<any, ApiResponse<{
        invites: CommunityInvite[];
        total: number;
        page: number;
        lastPage: number;
    }>>("/communities/invitations/me");
    return response.data;
}

export async function respondToCommunityInvitation(inviteId: string, accept: boolean) {
    return api.post(`/communities/invitations/${inviteId}/${accept ? "accept" : "reject"}`);
}

export async function getCommunityPosts(idOrSlug: string, page = 1) {
    const response = await api.get<any, ApiResponse<{
        posts: any[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/communities/${idOrSlug}/posts?page=${page}&limit=10`);
    return response.data;
}

export async function createCommunityPost(idOrSlug: string, content: string) {
    const response = await api.post<any, ApiResponse<any>>(`/communities/${idOrSlug}/posts`, { content });
    return response.data;
}
