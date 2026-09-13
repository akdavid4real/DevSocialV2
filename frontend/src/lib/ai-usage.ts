import api from "@/lib/api"

export interface AiFeatureUsage {
    used: number
    limit: number
    remaining: number
}

export interface AiUsage {
    summaries: AiFeatureUsage
    transcriptions: AiFeatureUsage
    imageAnalysis: AiFeatureUsage
    isPremium: boolean
    resetsOn?: string | null
}

interface ApiResponse<T> {
    data: T
}

export async function getAiUsage() {
    const response = await api.get<any, ApiResponse<AiUsage>>("/users/ai-usage")
    return response.data
}
