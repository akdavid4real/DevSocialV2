import api from "@/lib/api";

export const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
    id: string;
    title: string;
    description: string;
    authorId: string;
    author: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string;
        level: number;
    };
    technologies: string[];
    githubUrl?: string;
    liveUrl?: string;
    images: string[];
    openPositions?: Array<{
        title: string;
        description: string;
        requirements: string[];
    }>;
    status: ProjectStatus;
    visibility: "PUBLIC" | "PRIVATE";
    views: number;
    featured: boolean;
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getProjects(params?: {
    search?: string;
    status?: string;
    tech?: string;
    page?: number;
    limit?: number;
}) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.tech) searchParams.set("tech", params.tech);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<{
        projects: Project[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/projects${query ? `?${query}` : ""}`);

    return response.data;
}

export async function getMyProjects(params?: {
    status?: string;
    page?: number;
    limit?: number;
}) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<{
        projects: Project[];
        total: number;
        page: number;
        lastPage: number;
        stats: {
            totalViews: number;
            byStatus: Record<string, number>;
        };
    }>>(`/projects/me${query ? `?${query}` : ""}`);

    return response.data;
}

export async function createProject(input: {
    title: string;
    description: string;
    technologies: string[];
    githubUrl?: string;
    liveUrl?: string;
    openPositions?: Array<{ title: string; description: string; requirements: string[] }>;
    status: ProjectStatus;
}) {
    const response = await api.post<any, ApiResponse<Project>>("/projects", input);
    return response.data;
}

export async function getProject(id: string) {
    const response = await api.get<any, ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
    const response = await api.put<any, ApiResponse<Project>>(`/projects/${id}/status`, { status });
    return response.data;
}

export async function deleteProject(id: string) {
    const response = await api.delete<any, ApiResponse<{ success: boolean; message: string }>>(`/projects/${id}`);
    return response.data;
}

export function formatProjectStatus(status: string) {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
