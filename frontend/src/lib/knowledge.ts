import api from "@/lib/api";

export const KNOWLEDGE_CATEGORIES = [
    "TUTORIAL",
    "CODE_SNIPPET",
    "BEST_PRACTICE",
    "TROUBLESHOOTING",
    "CONFIGURATION",
    "API_REFERENCE",
    "COMMAND_REFERENCE",
    "QUICK_TIP",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export interface KnowledgeEntry {
    id: string;
    title: string;
    technology: string;
    category: KnowledgeCategory;
    content: string;
    codeExample?: string;
    tags: string[];
    authorId: string;
    likesCount: number;
    author?: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string;
        level: number;
    } | null;
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function getKnowledgeEntries(params?: {
    search?: string;
    technology?: string;
    category?: string;
    page?: number;
    limit?: number;
}) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.technology) searchParams.set("technology", params.technology);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const response = await api.get<any, ApiResponse<{
        entries: KnowledgeEntry[];
        total: number;
        page: number;
        lastPage: number;
    }>>(`/knowledge-bank${query ? `?${query}` : ""}`);

    return response.data;
}

export async function createKnowledgeEntry(input: {
    title: string;
    technology: string;
    category: KnowledgeCategory;
    content: string;
    codeExample?: string;
    tags: string[];
}) {
    const response = await api.post<any, ApiResponse<KnowledgeEntry>>("/knowledge-bank", input);
    return response.data;
}

export async function getKnowledgeEntry(id: string) {
    const response = await api.get<any, ApiResponse<KnowledgeEntry>>(`/knowledge-bank/${id}`);
    return response.data;
}

export function formatKnowledgeCategory(category: string) {
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
