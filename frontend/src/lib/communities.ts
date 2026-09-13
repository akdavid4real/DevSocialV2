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
        memberCount: number;
        community: Community;
    }>>(`/communities/${idOrSlug}/join`);
    return response.data;
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
