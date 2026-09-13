import api from "@/lib/api"

export type EnhanceAction = "professional" | "casual" | "funny" | "hashtags"

type AiResponse<T> = {
  success: boolean
  data: T
}

export async function summarizePost(content: string) {
  const response = await api.post<any, AiResponse<{
    summary: string
    remainingUsage: number
    monthlyLimit: number
  }>>("/posts/summarize", { content })
  return response.data
}

export async function explainPost(content: string) {
  const response = await api.post<any, AiResponse<{
    explanation: string
    remainingUsage: number
    dailyLimit: number
  }>>("/posts/explain", { content })
  return response.data
}

export async function enhanceText(content: string, action: EnhanceAction) {
  const response = await api.post<any, AiResponse<{
    enhanced: string
    remainingUsage: number
    monthlyLimit: number
  }>>("/ai/enhance-text", { content, action })
  return response.data
}
